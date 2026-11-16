// Creates the two demo schools and their users. Safe to run again.
// Run: node --env-file=.env.local scripts/seed-demo.mjs
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and DEMO_ACCOUNT_PASSWORD. Prints no secrets.
import { createClient } from "@supabase/supabase-js";

const DEMOS = [
  { email: "judge@braynix-review.chalk-demo.com", tenant: "Braynix Review" },
  { email: "teacher@maple-elementary.chalk-demo.com", tenant: "Maple Elementary" },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const password = process.env.DEMO_ACCOUNT_PASSWORD;
if (!url || !key || !password) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and DEMO_ACCOUNT_PASSWORD.");

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;

for (const demo of DEMOS) {
  let user = list.users.find((u) => u.email === demo.email);
  if (user) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email: demo.email, password, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }

  let { data: tenant } = await admin.from("tenants").select("id").eq("name", demo.tenant).maybeSingle();
  if (!tenant) {
    const { data, error } = await admin.from("tenants").insert({ name: demo.tenant }).select("id").single();
    if (error) throw error;
    tenant = data;
  }

  const { error: memberError } = await admin
    .from("memberships")
    .upsert({ tenant_id: tenant.id, user_id: user.id, role: "owner" }, { onConflict: "tenant_id,user_id" });
  if (memberError) throw memberError;
  console.log(`ready: ${demo.tenant}`);
}
