/** 68.2 -> "01:08" (padded) or "1:08" (compact). */
export function formatTime(seconds: number, padded = true): string {
  const s = Math.max(0, Math.floor(seconds + 1e-6));
  const m = Math.floor(s / 60);
  const rest = String(s % 60).padStart(2, "0");
  return `${padded ? String(m).padStart(2, "0") : m}:${rest}`;
}

/** Spoken form for aria-valuetext, e.g. "1 minute 8 seconds". */
export function spokenTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const parts = [];
  if (m) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  parts.push(`${s % 60} second${s % 60 === 1 ? "" : "s"}`);
  return parts.join(" ");
}
