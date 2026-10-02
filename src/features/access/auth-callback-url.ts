/** Capture this before Supabase consumes and removes the URL fragment. */
export function hasAuthCallback(url: URL): boolean {
  const hash = new URLSearchParams(url.hash.slice(1))
  return hash.has('access_token') || hash.has('error') || hash.has('error_code') || url.searchParams.has('code')
}
