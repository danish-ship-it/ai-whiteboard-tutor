import type { Lesson, Scene } from "./schema";

/**
 * Describes one scene for an image model, from what the lesson already says:
 * the subject, the scene title, the names of the things drawn on the board and
 * the opening sentences. (A separate field written by the model would make the
 * lesson's output schema too large for structured output.)
 */
export function visualPrompt(lesson: Lesson, scene: Scene): string {
  const drawn = new Set<string>();
  for (const beat of scene.beats)
    for (const action of beat.actions)
      if ((action.kind === "icon" || action.kind === "sketch") && action.label.trim()) drawn.add(action.label.trim());
  const opening = scene.beats
    .slice(0, 2)
    .map((b) => b.sentence)
    .join(" ");
  const parts = [
    `A realistic illustration for a lesson on ${lesson.title}: ${scene.title}.`,
    drawn.size ? `Show ${[...drawn].slice(0, 6).join(", ")}.` : "",
    `Context: ${opening}`,
  ];
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 700);
}
