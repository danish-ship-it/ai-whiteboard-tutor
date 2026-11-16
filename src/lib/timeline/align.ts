/** Character alignment as returned by ElevenLabs `with-timestamps`. */
export interface CharAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export type SyncQuality = "exact" | "mapped" | "estimated";

export interface CharClock {
  /** Start time in seconds of every character of the narration text. */
  times: number[];
  duration: number;
  quality: SyncQuality;
}

/** Speaking rate used when there is no usable alignment (≈150 wpm). */
const CHARS_PER_SECOND = 14.5;
const LOOKAHEAD = 12;

export function isUsableAlignment(a: CharAlignment | null | undefined): a is CharAlignment {
  if (!a) return false;
  const { characters: c, character_start_times_seconds: s, character_end_times_seconds: e } = a;
  if (!c.length || c.length !== s.length || c.length !== e.length) return false;
  for (let i = 0; i < s.length; i++) {
    if (!Number.isFinite(s[i]) || !Number.isFinite(e[i])) return false;
    if (i > 0 && s[i] < s[i - 1] - 1e-3) return false;
  }
  return true;
}

const norm = (ch: string) => ch.toLowerCase();
const isSpace = (ch: string) => /\s/.test(ch);

/**
 * Maps every character of `text` to the time it is spoken.
 *
 * Prefers the original-text alignment; falls back to normalized alignment
 * (where "3" may have become "three") by greedy matching with a small
 * lookahead, interpolating any character that has no match. Without usable
 * alignment it estimates timing from character count, and says so.
 */
export function buildCharClock(
  text: string,
  alignment: CharAlignment | null | undefined,
  normalized: CharAlignment | null | undefined,
  audioDuration?: number,
): CharClock {
  const source = isUsableAlignment(alignment) ? alignment : isUsableAlignment(normalized) ? normalized : null;

  if (!source) {
    const duration = audioDuration && audioDuration > 0 ? audioDuration : text.length / CHARS_PER_SECOND;
    const times = Array.from({ length: text.length }, (_, i) => (i / Math.max(1, text.length)) * duration);
    return { times, duration, quality: "estimated" };
  }

  const chars = source.characters;
  const starts = source.character_start_times_seconds;
  const lastEnd = source.character_end_times_seconds[chars.length - 1] ?? 0;
  const duration = Math.max(lastEnd, audioDuration ?? 0);

  if (chars.join("") === text) {
    return { times: starts.slice(), duration, quality: "exact" };
  }

  const matched: (number | undefined)[] = new Array(text.length);
  let j = 0;
  for (let i = 0; i < text.length && j < chars.length; i++) {
    if (isSpace(text[i])) continue;
    while (j < chars.length && isSpace(chars[j])) j++;
    let k = j;
    while (k < chars.length && k < j + LOOKAHEAD && norm(chars[k]) !== norm(text[i])) k++;
    if (k < chars.length && norm(chars[k]) === norm(text[i])) {
      matched[i] = starts[k];
      j = k + 1;
    }
  }

  return { times: interpolate(matched, duration), duration, quality: "mapped" };
}

function interpolate(values: (number | undefined)[], duration: number): number[] {
  const out = new Array<number>(values.length);
  let prevIndex = -1;
  let prevValue = 0;
  for (let i = 0; i <= values.length; i++) {
    const v = i === values.length ? duration : values[i];
    if (v === undefined) continue;
    const value = Math.max(v, prevValue);
    for (let g = prevIndex + 1; g < i; g++) {
      out[g] = prevValue + ((value - prevValue) * (g - prevIndex)) / (i - prevIndex);
    }
    if (i < values.length) out[i] = value;
    prevIndex = i;
    prevValue = value;
  }
  return out;
}
