import "server-only";

export class ConfigError extends Error {}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith("your-") || value === "change-me") {
    throw new ConfigError(`Server is missing the ${name} environment variable.`);
  }
  return value;
}

export const env = {
  anthropicKey: () => required("ANTHROPIC_API_KEY"),
  anthropicModel: () => process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5",
  lessonEffort: (): "low" | "medium" | "high" => {
    const v = process.env.LESSON_EFFORT?.trim();
    return v === "medium" || v === "high" ? v : "low";
  },
  elevenLabsKey: () => required("ELEVENLABS_API_KEY"),
  elevenLabsVoice: () => required("ELEVENLABS_VOICE_ID"),
  elevenLabsModel: () => process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2",
  signingSecret: () => required("LESSON_SIGNING_SECRET"),
};
