import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/db-types";

/**
 * Runs on every request through `middleware.ts`. Refreshes the Supabase
 * session cookie and redirects unauthenticated users away from /admin.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: `getUser()` re-validates the JWT. Without this call, a stale
  // cookie can let an ex-user through.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl;
  const isAdminRoute = url.pathname.startsWith("/admin");
  const isLoginRoute = url.pathname === "/login";

  if (isAdminRoute && !user) {
    const loginUrl = url.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", url.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && user) {
    const adminUrl = url.clone();
    adminUrl.pathname = "/admin";
    adminUrl.search = "";
    return NextResponse.redirect(adminUrl);
  }

  return response;
}
