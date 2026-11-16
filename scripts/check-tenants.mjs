// Checks that row-level security keeps the demo schools apart. Leaves no data behind.
// Run: node --env-file=.env.local scripts/check-tenants.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const password = process.env.DEMO_ACCOUNT_PASSWORD;
const signIn = async (email) => {
  const c = createClient(url, pub, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
};
const results = [];
const check = (name, ok) => results.push(`${ok ? "PASS" : "FAIL"} ${name}`);

const braynix = await signIn("judge@braynix-review.chalk-demo.com");
const maple = await signIn("teacher@maple-elementary.chalk-demo.com");
const anon = createClient(url, pub, { auth: { persistSession: false } });

const { data: bt } = await braynix.from("memberships").select("tenant_id").single();
const { data: mt } = await maple.from("memberships").select("tenant_id").single();
check("each user sees exactly one membership", !!bt && !!mt && bt.tenant_id !== mt.tenant_id);
const { data: tenantsSeen } = await maple.from("tenants").select("name");
check("maple sees only its own school", tenantsSeen?.length === 1 && tenantsSeen[0].name === "Maple Elementary");

const id = crypto.randomUUID();
const row = { id, tenant_id: bt.tenant_id, topic: "isolation check", title: "Isolation check", lesson: {}, token: "t", token_expires_at: new Date(Date.now() + 864e5).toISOString() };
const ins = await braynix.from("lessons").insert(row);
check("braynix can save to its school", !ins.error);

const { data: mapleView } = await maple.from("lessons").select("id").eq("id", id);
check("maple can't read braynix's lesson", mapleView?.length === 0);
const { data: anonView } = await anon.from("lessons").select("id");
check("signed-out visitor reads nothing", (anonView?.length ?? 0) === 0);
const upd = await maple.from("lessons").update({ title: "hacked" }).eq("id", id).select("id");
check("maple can't edit braynix's lesson", (upd.data?.length ?? 0) === 0);
const del = await maple.from("lessons").delete().eq("id", id).select("id");
check("maple can't delete braynix's lesson", (del.data?.length ?? 0) === 0);
const cross = await maple.from("lessons").insert({ ...row, id: crypto.randomUUID() });
check("maple can't save into braynix's school", !!cross.error);

const path = `${bt.tenant_id}/${id}`;
const up = await braynix.storage.from("narration").upload(path, new Blob([new Uint8Array(16)], { type: "audio/mpeg" }), { contentType: "audio/mpeg" });
check("braynix can store voice audio", !up.error);
const steal = await maple.storage.from("narration").download(path);
check("maple can't download braynix's audio", !!steal.error || !steal.data);
const plant = await maple.storage.from("narration").upload(`${bt.tenant_id}/${crypto.randomUUID()}`, new Blob([new Uint8Array(16)], { type: "audio/mpeg" }), { contentType: "audio/mpeg" });
check("maple can't upload into braynix's folder", !!plant.error);

await braynix.storage.from("narration").remove([path]);
await braynix.from("lessons").delete().eq("id", id);
const { data: left } = await braynix.from("lessons").select("id").eq("id", id);
check("cleanup removed the test lesson", left?.length === 0);

console.log(results.join("\n"));
if (results.some((r) => r.startsWith("FAIL"))) process.exit(1);
