import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, authEnabled } from "@/lib/supabase/config";

/**
 * Keeps the Supabase session cookie fresh and sends signed-out visitors to /login.
 * This is only the optimistic check: every paid API route verifies the user again itself.
 */
export async function proxy(request: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!data.user && path !== "/login" && !path.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (data.user && path === "/login") return NextResponse.redirect(new URL("/", request.url));
  return response;
}

export const config = {
  // Pages and API routes; not Next's own files, demo media or icons.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|demos/|.*\\.(?:svg|png|jpg|jpeg|webp|mp3|mp4)$).*)"],
};
