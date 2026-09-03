import type { SupabaseClient } from "@supabase/supabase-js";

/** Schema-aligned payload for the public “express interest in serving” form. */
export interface ServeInterestSubmission {
  name: string;
  email: string;
  /** Optional phone number, normalized to E.164 (for example, +13035550123). */
  phoneE164?: string;
  availability?: string[];
  desiredWaysToServe?: string[];
  notes?: string;
}

/** Schema-aligned payload for the public updates opt-in form. */
export interface UpdatesSubscription {
  name: string;
  email: string;
  /** Honeypot only; a filled value is accepted without sending an email. */
  website?: string;
}

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} is required.`);
  }
  return normalized;
}

function email(value: string): string {
  const normalized = requiredText(value, "Email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Email must be a valid email address.");
  }
  return normalized;
}

function optionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

function phoneE164(value: string | undefined): string | null {
  const normalized = optionalText(value);
  if (normalized && !/^\+[1-9][0-9]{7,14}$/.test(normalized)) {
    throw new Error("Phone must use E.164 format, for example +13035550123.");
  }
  return normalized;
}

/**
 * Persists a public service-interest submission through a narrowly scoped
 * RPC. It only creates a review-queue item; it never creates an account or
 * assigns a volunteer shift.
 */
export async function submitServeInterest(
  client: SupabaseClient,
  submission: ServeInterestSubmission,
): Promise<void> {
  const { error } = await client.rpc("submit_serve_interest", {
    p_name: requiredText(submission.name, "Name"),
    p_email: email(submission.email),
    p_phone_e164: phoneE164(submission.phoneE164),
    p_availability: submission.availability ?? [],
    p_desired_ways_to_serve: submission.desiredWaysToServe ?? [],
    p_notes: optionalText(submission.notes),
  });

  if (error) {
    throw new Error(`Unable to send service interest: ${error.message}`);
  }
}

/** Starts a double-opt-in request through a public, rate-limited Edge Function. */
export async function subscribeToUpdates(
  client: SupabaseClient,
  subscription: UpdatesSubscription,
): Promise<void> {
  const { error } = await client.functions.invoke("request-update-subscription", {
    body: {
      name: requiredText(subscription.name, "Name"),
      email: email(subscription.email),
      website: optionalText(subscription.website) ?? "",
    },
  });

  if (error) {
    throw new Error("We could not start your email confirmation. Please try again shortly.");
  }
}

/** Confirms a one-time update subscription token from the recipient's email. */
export async function confirmUpdateSubscription(client: SupabaseClient, token: string): Promise<boolean> {
  const { data, error } = await client.functions.invoke<{ confirmed?: unknown }>("confirm-update-subscription", {
    body: { token },
  });
  if (error) throw new Error("We could not confirm this subscription right now.");
  return data?.confirmed === true;
}

/** Applies an opaque, recipient-held update unsubscribe token. */
export async function unsubscribeFromUpdates(client: SupabaseClient, token: string): Promise<boolean> {
  const { data, error } = await client.functions.invoke<{ unsubscribed?: unknown }>("unsubscribe-updates", {
    body: { token },
  });
  if (error) throw new Error("We could not process this unsubscribe request right now.");
  return data?.unsubscribed === true;
}
