import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for use in Server Components, Server Actions
 * and Route Handlers.
 *
 * The legacy `createServerComponentClient` name from previous versions of
 * `@supabase/auth-helpers-nextjs` was removed when the package was
 * consolidated into `@supabase/ssr`. We keep the familiar name here.
 *
 * In Next.js 16, `cookies()` from `next/headers` is async, so this helper
 * is async as well.
 */
export async function createServerComponentClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias."
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot mutate cookies; the auth refresh
          // will be handled by middleware / route handlers instead.
        }
      },
    },
  });
}
