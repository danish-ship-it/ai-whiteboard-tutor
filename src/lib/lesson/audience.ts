/** Who the lesson is for; changes vocabulary, examples and pace, not the facts. */
export const AUDIENCES = [
  { id: "kids", label: "Kids", hint: "8–12" },
  { id: "teens", label: "Teens", hint: "13–17" },
  { id: "adults", label: "Adults", hint: "16+" },
] as const;

export type Audience = (typeof AUDIENCES)[number]["id"];
export const DEFAULT_AUDIENCE: Audience = "adults";
export const isAudience = (value: unknown): value is Audience => AUDIENCES.some((a) => a.id === value);
