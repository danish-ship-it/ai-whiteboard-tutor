"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, authEnabled } from "./config";

let client: SupabaseClient | null = null;

/** The signed-in user's client. Every query runs under row-level security as that user. */
export function supabaseBrowser(): SupabaseClient | null {
  if (!authEnabled()) return null;
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
