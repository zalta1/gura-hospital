import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] ?? "";
const supabaseKey =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
  import.meta.env["VITE_SUPABASE_ANON_KEY"] ??
  "";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, header) => headers.set(header, value));
    }
    if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

const isBrowser = typeof window !== "undefined";

export const supabase = createClient<Database>(
  supabaseUrl || "http://127.0.0.1:54321",
  supabaseKey || "public-anon-key",
  {
    global: supabaseKey ? { fetch: createSupabaseFetch(supabaseKey) } : undefined,
    auth: isBrowser
      ? {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
        }
      : {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
  },
);
