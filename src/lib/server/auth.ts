import "server-only";
import { authEnabled } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonError } from "./http";

/**
 * Paid routes (lessons, narration, questions, pictures) need a signed-in user when sign-in is on.
 * Returns the user id to key rate limits by, or a 401 response. With sign-in off it returns null.
 */
export async function requireUser(): Promise<{ userId: string | null; denied?: Response }> {
  if (!authEnabled()) return { userId: null };
  const supabase = await supabaseServer();
  // getUser asks Supabase Auth to validate the token; it isn't just decoding the cookie.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { userId: null, denied: jsonError("Please sign in to continue.", 401) };
  return { userId: data.user.id };
}
