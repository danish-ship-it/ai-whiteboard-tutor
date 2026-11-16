"use client";

import { authEnabled } from "@/lib/supabase/config";
import * as cloud from "./cloud-history";
import * as local from "./history";

/**
 * Where saved lessons live: the signed-in tenant's database when sign-in is on,
 * otherwise this browser (IndexedDB). Both offer the same functions.
 */
const store = () => (authEnabled() ? cloud : local);

export type { SavedLesson, SavedLessonSummary, SavedVisuals } from "./history";
export const saveLesson: typeof local.saveLesson = (record) => store().saveLesson(record);
export const listLessons: typeof local.listLessons = () => store().listLessons();
export const getLesson: typeof local.getLesson = (id) => store().getLesson(id);
export const saveVisuals: typeof local.saveVisuals = (id, visuals) => store().saveVisuals(id, visuals);
export const deleteLesson: typeof local.deleteLesson = (id) => store().deleteLesson(id);
