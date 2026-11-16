import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/** A server client acting as the user in the request's session cookies (row-level security applies). */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        // Route handlers can set cookies; Server Components can't, and the proxy refreshes them there.
        try {
          for (const { name, value, options } of toSet) store.set(name, value, options);
        } catch {}
      },
    },
  });
}
