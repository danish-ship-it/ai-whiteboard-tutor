"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";
import type { SavedLesson, SavedLessonSummary, SavedVisuals } from "./history";

/**
 * Lesson history in the signed-in user's tenant (Supabase). Row-level security does the scoping:
 * these queries can only ever see or change lessons of tenants the user belongs to.
 * Narration audio is stored in the private "narration" bucket under the tenant's folder.
 */

const BUCKET = "narration";
let tenant: Promise<{ id: string; name: string } | null> | null = null;

/** The tenant new lessons are saved to: the user's first membership. */
export function currentTenant(): Promise<{ id: string; name: string } | null> {
  const db = supabaseBrowser();
  if (!db) return Promise.resolve(null);
  tenant ??= (async () => {
    const { data, error } = await db.from("memberships").select("tenant_id, tenants(name)").order("created_at").limit(1).maybeSingle();
    if (error || !data) {
      tenant = null;
      return null;
    }
    const joined = data.tenants as unknown as { name: string } | null;
    return { id: data.tenant_id as string, name: joined?.name ?? "Your workspace" };
  })();
  return tenant;
}

/** Forget the cached tenant (after signing out or in as someone else). */
export function resetTenant(): void {
  tenant = null;
}

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (value: string) => new Date(value).getTime();

export async function saveLesson(record: SavedLesson): Promise<boolean> {
  const db = supabaseBrowser();
  const t = await currentTenant();
  if (!db || !t) return false;
  let audioPath: string | null = null;
  if (record.audio) {
    audioPath = `${t.id}/${record.id}`;
    const { error } = await db.storage.from(BUCKET).upload(audioPath, record.audio, { contentType: record.mimeType ?? "audio/mpeg", upsert: true });
    if (error) {
      console.warn("Couldn't save the lesson's voice.", error.message);
      return false;
    }
  }
  const { error } = await db.from("lessons").insert({
    id: record.id,
    tenant_id: t.id,
    topic: record.topic,
    title: record.title,
    lesson: record.lesson,
    token: record.token,
    token_expires_at: iso(record.tokenExpiresAt),
    audio_path: audioPath,
    mime_type: record.mimeType,
    alignment: record.alignment,
    normalized_alignment: record.normalizedAlignment,
    duration: record.duration,
    visuals: record.visuals ?? {},
    created_at: iso(record.createdAt),
    last_opened_at: iso(record.lastOpenedAt),
  });
  if (error) console.warn("Couldn't save the lesson.", error.message);
  return !error;
}

export async function listLessons(): Promise<SavedLessonSummary[]> {
  const db = supabaseBrowser();
  if (!db) return [];
  const { data, error } = await db
    .from("lessons")
    .select("id, topic, title, duration, created_at, last_opened_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error || !data) return [];
  return data.map((r) => ({
    version: 1 as const,
    id: r.id,
    topic: r.topic,
    title: r.title,
    duration: r.duration,
    createdAt: ms(r.created_at),
    lastOpenedAt: ms(r.last_opened_at),
  }));
}

export async function getLesson(id: string): Promise<SavedLesson | null> {
  const db = supabaseBrowser();
  if (!db) return null;
  const { data: r, error } = await db.from("lessons").select("*").eq("id", id).maybeSingle();
  if (error || !r) return null;
  void db.from("lessons").update({ last_opened_at: iso(Date.now()) }).eq("id", id).then(() => {});
  let audio: Blob | null = null;
  if (r.audio_path) {
    const download = await db.storage.from(BUCKET).download(r.audio_path);
    audio = download.data ?? null;
  }
  return {
    version: 1,
    id: r.id,
    topic: r.topic,
    title: r.title,
    lesson: r.lesson,
    token: r.token,
    tokenExpiresAt: ms(r.token_expires_at),
    audio,
    mimeType: r.mime_type,
    alignment: r.alignment,
    normalizedAlignment: r.normalized_alignment,
    duration: r.duration,
    createdAt: ms(r.created_at),
    lastOpenedAt: Date.now(),
    visuals: r.visuals ?? undefined,
  };
}

export async function saveVisuals(id: string, visuals: SavedVisuals): Promise<boolean> {
  const db = supabaseBrowser();
  if (!db) return false;
  const { error } = await db.from("lessons").update({ visuals }).eq("id", id);
  return !error;
}

export async function deleteLesson(id: string): Promise<boolean> {
  const db = supabaseBrowser();
  if (!db) return false;
  const { data } = await db.from("lessons").select("audio_path").eq("id", id).maybeSingle();
  const { error } = await db.from("lessons").delete().eq("id", id);
  if (!error && data?.audio_path) await db.storage.from(BUCKET).remove([data.audio_path]);
  return !error;
}
