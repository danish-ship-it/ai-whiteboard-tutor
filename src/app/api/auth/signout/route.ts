import { authEnabled } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST() {
  if (authEnabled()) await (await supabaseServer()).auth.signOut();
  return Response.json({ ok: true });
}
