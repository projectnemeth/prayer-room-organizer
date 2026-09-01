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
  email: string;
  /** Stored with consent so its origin is auditable. */
  consentSource?: string;
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

/**
 * Records a public email-updates opt-in through the narrowly scoped database
 * function. It cannot expose or modify volunteer scheduling data.
 */
export async function subscribeToUpdates(
  client: SupabaseClient,
  subscription: UpdatesSubscription,
): Promise<void> {
  const { error } = await client.rpc("subscribe_to_updates", {
    p_email: email(subscription.email),
    p_consent_source: optionalText(subscription.consentSource) ?? "public_updates_form",
  });

  if (error) {
    throw new Error(`Unable to subscribe to updates: ${error.message}`);
  }
}
