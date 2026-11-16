import "server-only";
import type { CharAlignment } from "../timeline/align";
import { env } from "./env";
import { TutorError } from "./claude";

export interface NarrationAudio {
  audioBase64: string;
  mimeType: "audio/mpeg";
  alignment: CharAlignment | null;
  normalizedAlignment: CharAlignment | null;
}

const ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech";
/** 96 kbps keeps a ~2.5 minute lesson well under Vercel's 4.5 MB response limit as base64. */
const OUTPUT_FORMAT = "mp3_44100_96";
const MAX_CHARS = 3200;

/** Synthesizes the whole narration in one request, with per-character timestamps. */
export async function synthesizeNarration(text: string, signal?: AbortSignal): Promise<NarrationAudio> {
  if (text.length > MAX_CHARS) throw new TutorError("The lesson narration is too long to record.", 422);

  const url = `${ENDPOINT}/${encodeURIComponent(env.elevenLabsVoice())}/with-timestamps?output_format=${OUTPUT_FORMAT}`;
  const timeout = AbortSignal.timeout(90_000);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "xi-api-key": env.elevenLabsKey(), "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        text,
        model_id: env.elevenLabsModel(),
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.15, speed: 1.0 },
      }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") throw new TutorError("Recording the voice took too long. Please try again.", 504);
    throw error;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`ElevenLabs ${response.status}: ${detail.slice(0, 300)}`);
    if (response.status === 401 || response.status === 403) throw new TutorError("The voice service is not configured correctly on the server.", 500);
    if (response.status === 429) throw new TutorError("The voice service is busy. Please try again in a minute.", 429);
    throw new TutorError("The voice service had a problem. Please try again.", 502);
  }

  const data = (await response.json()) as {
    audio_base64?: string;
    alignment?: CharAlignment | null;
    normalized_alignment?: CharAlignment | null;
  };
  if (!data.audio_base64) throw new TutorError("The voice service returned no audio.", 502);

  return {
    audioBase64: data.audio_base64,
    mimeType: "audio/mpeg",
    alignment: data.alignment ?? null,
    normalizedAlignment: data.normalized_alignment ?? null,
  };
}
