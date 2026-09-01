import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Sends a sign-in link only to an existing Auth user. `shouldCreateUser: false`
 * is the client-side guard that keeps this invitation-only; profile status and
 * database RLS remain the authorization authority after sign-in.
 */
export async function requestInvitationMagicLink(
  client: SupabaseClient,
  email: string,
  redirectTo: string,
) {
  const { error } = await client.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  })

  if (error) throw error
}
