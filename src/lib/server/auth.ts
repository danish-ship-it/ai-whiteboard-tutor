import "server-only";
import { authEnabled } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonError } from "./http";

/**
 * Paid routes (lessons, narration, questions, pictures) need a signed-in member of a school when
 * sign-in is on. An account alone is not enough: someone who registers themselves belongs to no
 * school and must not be able to spend the AI credits.
 * Returns the user id to key rate limits by, or a 401/403 response. With sign-in off it returns null.
 */
export async function requireUser(): Promise<{ userId: string | null; denied?: Response }> {
  if (!authEnabled()) {
    // Production must never serve paid routes without sign-in, even if its settings go missing.
    if (process.env.VERCEL_ENV === "production") return { userId: null, denied: jsonError("Sign-in isn't configured on this server.", 503) };
    return { userId: null };
  }
  const supabase = await supabaseServer();
  // getUser asks Supabase Auth to validate the token; it isn't just decoding the cookie.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { userId: null, denied: jsonError("Please sign in to continue.", 401) };
  // Row-level security only shows the user's own memberships.
  const { data: membership, error: membershipError } = await supabase.from("memberships").select("tenant_id").limit(1).maybeSingle();
  if (membershipError || !membership) return { userId: null, denied: jsonError("This account isn't part of a school yet.", 403) };
  return { userId: data.user.id };
}

/** Paid calls each school may make per day, across every server instance. */
export const DAILY_BUDGET = { lesson: 40, narration: 40, ask: 200, image: 120, video: 30 } as const;
export type BudgetKind = keyof typeof DAILY_BUDGET;

/**
 * Counts one paid call against the signed-in user's school (atomically, in the database) and
 * returns a 429 once today's budget is spent. Call it right before the paid work, after the
 * request has been validated. With sign-in off there is no school, and only the rate limits apply.
 */
export async function chargeBudget(kind: BudgetKind): Promise<Response | null> {
  if (!authEnabled()) return null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("use_quota", { p_kind: kind, p_daily_limit: DAILY_BUDGET[kind] });
  if (error) {
    console.error(`Budget check failed: ${error.message}`);
    return jsonError("Couldn't check today's usage. Please try again.", 503);
  }
  return data === true ? null : jsonError("Your school has used today's allowance for this. It resets tomorrow.", 429);
}
