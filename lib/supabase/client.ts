"use client";

import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Singleton browser-side Supabase client.
 *
 * The legacy `createClientComponentClient` name from earlier versions of
 * `@supabase/auth-helpers-nextjs` was removed when the package was
 * consolidated into `@supabase/ssr`. We keep the familiar name here so
 * Client Components can import the same way, and reuse a single instance
 * across hot module reloads / re-renders to preserve auth state.
 */
let cached: SupabaseClient | null = null;

export function createClientComponentClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias."
    );
  }

  cached = createBrowserClient(url, anonKey);
  return cached;
}
