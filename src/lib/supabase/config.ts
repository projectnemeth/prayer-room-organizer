/**
 * The only Supabase settings that may be present in the browser bundle.
 * Access to data is enforced by Supabase Row Level Security, never by secrecy
 * of the anonymous key.
 */
export interface SupabaseBrowserConfig {
  url: string;
  anonKey: string;
}

export type SupabaseEnvironment = Readonly<Record<string, string | undefined>>;

function requiredValue(environment: SupabaseEnvironment, name: string): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`Missing required Supabase browser configuration: ${name}.`);
  }

  return value;
}

/** Returns true when both public browser settings have been supplied. */
export function hasSupabaseBrowserConfig(environment: SupabaseEnvironment): boolean {
  return Boolean(environment.VITE_SUPABASE_URL?.trim() && environment.VITE_SUPABASE_ANON_KEY?.trim());
}

/**
 * Validates and returns browser-safe Supabase configuration.
 *
 * This function is intentionally lazy: importing the app remains possible for
 * static-only deployments until a route needs a Supabase-backed capability.
 */
export function getSupabaseBrowserConfig(
  environment: SupabaseEnvironment = import.meta.env,
): SupabaseBrowserConfig {
  const url = requiredValue(environment, "VITE_SUPABASE_URL");

  try {
    new URL(url);
  } catch {
    throw new Error("VITE_SUPABASE_URL must be a valid absolute URL.");
  }

  return {
    url,
    anonKey: requiredValue(environment, "VITE_SUPABASE_ANON_KEY"),
  };
}
