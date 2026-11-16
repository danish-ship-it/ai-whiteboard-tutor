/**
 * Sign-in and tenant-scoped lesson history switch on when the Supabase project is configured.
 * Without these two public values the app runs as before: no login, history kept in the browser.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function authEnabled(): boolean {
  return SUPABASE_URL.startsWith("https://") && SUPABASE_KEY.length > 20;
}

/** The demo tenants judges can sign in to with one click. Passwords stay on the server. */
export const DEMO_ACCOUNTS = {
  braynix: { email: "judge@braynix-review.chalk-demo.com", tenant: "Braynix Review", label: "Braynix Review", role: "Reviewer" },
  maple: { email: "teacher@maple-elementary.chalk-demo.com", tenant: "Maple Elementary", label: "Maple Elementary", role: "Teacher" },
} as const;
export type DemoAccount = keyof typeof DEMO_ACCOUNTS;
