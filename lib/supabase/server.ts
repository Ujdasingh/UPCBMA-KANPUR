import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/db-types";

/**
 * Supabase client for use in Server Components and Server Actions.
 * Reads/writes the session cookie via Next's `cookies()` helper.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `set` throws inside Server Components. It's OK — the middleware
            // handles session refresh. Safely ignore here.
          }
        },
      },
    },
  );
}

/**
 * Service-role client — bypasses Row Level Security.
 * NEVER import this into a Client Component or middleware that runs on the edge.
 * Used only for privileged server-only work (e.g., creating auth users from
 * the admin section, reading dashboard counts across all rows regardless of RLS).
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
