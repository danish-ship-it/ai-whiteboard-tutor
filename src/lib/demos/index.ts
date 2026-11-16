import type { Lesson } from "../lesson/schema";
import type { CharAlignment } from "../timeline/align";

/** Lessons recorded with scripts/make-demo.mjs; audio lives in public/demos/<slug>.mp3. */
export const DEMOS = [
  { slug: "solar-system", title: "The planets of our solar system" },
  { slug: "photosynthesis", title: "How photosynthesis works" },
  { slug: "pythagoras", title: "The Pythagorean theorem" },
] as const;

export type DemoSlug = (typeof DEMOS)[number]["slug"];

export interface DemoRecording {
  topic: string;
  lesson: Lesson;
  mimeType: string;
  alignment: CharAlignment | null;
  normalizedAlignment: CharAlignment | null;
}

export const isDemoSlug = (value: unknown): value is DemoSlug => DEMOS.some((d) => d.slug === value);

/** Runway illustrations for each demo scene, in public/demos/visuals/<slug>-<sceneId>.{jpg,mp4}. */
export const demoVisuals = (slug: DemoSlug, lesson: Lesson) =>
  Object.fromEntries(
    lesson.scenes.map((s) => [s.id, { image: `/demos/visuals/${slug}-${s.id}.jpg`, video: `/demos/visuals/${slug}-${s.id}.mp4` }]),
  );
