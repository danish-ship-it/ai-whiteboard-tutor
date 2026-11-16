import type { Lesson } from "./schema";

export interface BeatSpan {
  sceneIndex: number;
  beatIndex: number;
  /** Character offset of the sentence in the full narration text. */
  start: number;
  end: number;
}

const BEAT_SEPARATOR = " ";
const SCENE_SEPARATOR = "\n\n";

/**
 * The exact text sent to text-to-speech, plus where every sentence sits in it.
 * The server and client both derive the text from the manifest with this one
 * function, so character offsets always agree with the audio alignment.
 */
export function buildNarration(lesson: Lesson): { text: string; spans: BeatSpan[] } {
  let text = "";
  const spans: BeatSpan[] = [];
  lesson.scenes.forEach((scene, sceneIndex) => {
    scene.beats.forEach((beat, beatIndex) => {
      if (text) text += beatIndex === 0 ? SCENE_SEPARATOR : BEAT_SEPARATOR;
      spans.push({ sceneIndex, beatIndex, start: text.length, end: text.length + beat.sentence.length });
      text += beat.sentence;
    });
  });
  return { text, spans };
}
