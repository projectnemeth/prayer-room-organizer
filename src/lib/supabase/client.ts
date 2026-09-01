import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserConfig, type SupabaseBrowserConfig } from "./config";

let browserClient: SupabaseClient | undefined;

/** Creates a browser client from public Vite configuration. */
export function createSupabaseBrowserClient(
  config: SupabaseBrowserConfig = getSupabaseBrowserConfig(),
): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Returns one browser client per page load. It is lazy so pages that do not
 * need Supabase can still be served without browser configuration.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  browserClient ??= createSupabaseBrowserClient();
  return browserClient;
}
