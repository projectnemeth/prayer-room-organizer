export function projectApiKey(
  environment: Record<string, string | undefined>,
  keySetName: string,
  legacyKeyName: string,
): string | undefined {
  const rawKeySet = environment[keySetName];

  if (rawKeySet) {
    try {
      const keySet = JSON.parse(rawKeySet) as { default?: unknown };
      if (typeof keySet.default === "string" && keySet.default) return keySet.default;
    } catch {
      // Fall back to Supabase's legacy environment variables below.
    }
  }

  return environment[legacyKeyName];
}
