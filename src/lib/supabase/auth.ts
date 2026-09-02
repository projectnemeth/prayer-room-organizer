import type { SupabaseClient } from '@supabase/supabase-js'

export type PrivateAccessErrorCode =
  | 'email-rate-limited'
  | 'email-delivery-unavailable'
  | 'private-access-unavailable'

/**
 * An intentionally non-sensitive error for the invitation-only sign-in form.
 * It never confirms whether a submitted email address has an account.
 */
export class PrivateAccessError extends Error {
  readonly code: PrivateAccessErrorCode
  readonly userMessage: string

  constructor(code: PrivateAccessErrorCode, userMessage: string) {
    super(userMessage)
    this.name = 'PrivateAccessError'
    this.code = code
    this.userMessage = userMessage
  }
}

export type VolunteerInvitationResult =
  | { outcome: 'invitation-sent'; email: string }
  | { outcome: 'access-activated'; email: string }

export class VolunteerInvitationError extends Error {
  readonly code: string
  readonly userMessage: string

  constructor(code: string, userMessage: string) {
    super(userMessage)
    this.name = 'VolunteerInvitationError'
    this.code = code
    this.userMessage = userMessage
  }
}

function messageForMagicLinkError(error: unknown): PrivateAccessError {
  const rawMessage = error instanceof Error ? error.message.toLowerCase() : ''

  if (rawMessage.includes('rate limit')) {
    return new PrivateAccessError(
      'email-rate-limited',
      'Email delivery is temporarily limited. Please wait a few minutes and try again.',
    )
  }

  if (rawMessage.includes('smtp') || rawMessage.includes('email')) {
    return new PrivateAccessError(
      'email-delivery-unavailable',
      'We could not send a sign-in link right now. Please try again shortly or contact an Altar Initiative coordinator.',
    )
  }

  return new PrivateAccessError(
    'private-access-unavailable',
    'Private access is temporarily unavailable. Please try again shortly or contact an Altar Initiative coordinator.',
  )
}

function messageForInvitationError(payload: unknown): VolunteerInvitationError {
  const value = payload && typeof payload === 'object' ? payload as { code?: unknown; message?: unknown } : null
  const code = typeof value?.code === 'string' ? value.code : 'invitation-unavailable'

  const messages: Record<string, string> = {
    'interest-not-found': 'This serving interest is no longer available. Refresh the queue and try again.',
    'interest-not-ready': 'This serving interest has already been invited or closed. Refresh the queue before trying again.',
    forbidden: 'Your current role cannot send volunteer invitations.',
    unauthorized: 'Your session has ended. Sign in again before sending an invitation.',
    'auth-account-exists': 'This person already has a private account. Their access was not changed; ask them to use the private sign-in page.',
    'profile-activation-failed': 'The invitation may have been sent, but volunteer access needs attention. Check People & access before asking them to sign in.',
    'email-delivery-failed': 'The invitation could not be sent. Check the email provider and try again.',
  }

  return new VolunteerInvitationError(
    code,
    messages[code] ?? 'The invitation could not be sent. Please try again or check the email provider settings.',
  )
}

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

  if (error) throw messageForMagicLinkError(error)
}

/**
 * Calls the coordinator-only Edge Function. The browser sends the current
 * access token automatically; the function independently verifies the caller
 * and uses the service role only on the server.
 */
export async function inviteVolunteerFromInterest(
  client: SupabaseClient,
  interestId: string,
): Promise<VolunteerInvitationResult> {
  const { data, error } = await client.functions.invoke('invite-volunteer', {
    body: { interestId },
  })

  if (error) {
    let payload: unknown
    const context = 'context' in error ? error.context : undefined
    if (context instanceof Response) {
      try {
        payload = await context.clone().json()
      } catch {
        // A failed function must never expose raw server details to a coordinator.
      }
    }
    throw messageForInvitationError(payload)
  }

  const result = data as Partial<VolunteerInvitationResult> | null
  if (
    !result
    || (result.outcome !== 'invitation-sent' && result.outcome !== 'access-activated')
    || typeof result.email !== 'string'
  ) {
    throw new VolunteerInvitationError(
      'invalid-invitation-response',
      'The invitation service returned an unexpected response. Please try again.',
    )
  }

  return result as VolunteerInvitationResult
}

/** Ends the local Supabase session before returning to the invitation-only entry point. */
export async function signOutPrivateSession(client: SupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut()
  if (error) {
    throw new PrivateAccessError(
      'private-access-unavailable',
      'We could not sign you out on this device. Please try again.',
    )
  }
}
