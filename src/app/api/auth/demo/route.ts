import { DEMO_ACCOUNTS, authEnabled, type DemoAccount } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonError, limitOrNull, readJson } from "@/lib/server/http";

/**
 * One-click sign-in to a demo tenant. The demo password lives only in the server environment
 * (DEMO_ACCOUNT_PASSWORD), so it never reaches the browser or the repository.
 */
export async function POST(request: Request) {
  if (!authEnabled() || !process.env.DEMO_ACCOUNT_PASSWORD) return jsonError("Demo accounts aren't set up on this server.", 501);
  const limited = limitOrNull(request, "demo-login", 20, 10 * 60_000);
  if (limited) return limited;
  const body = await readJson(request, 1_000);
  const account = typeof body?.account === "string" && body.account in DEMO_ACCOUNTS ? DEMO_ACCOUNTS[body.account as DemoAccount] : null;
  if (!account) return jsonError("Unknown demo account.", 400);

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email: account.email, password: process.env.DEMO_ACCOUNT_PASSWORD });
  if (error) {
    console.error(`Demo sign-in failed: ${error.message}`);
    return jsonError("That demo account couldn't sign in. Please try again.", 502);
  }
  return Response.json({ ok: true });
}
