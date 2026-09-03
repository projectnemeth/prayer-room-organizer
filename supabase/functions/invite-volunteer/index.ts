import { createClient } from "npm:@supabase/supabase-js@2";
import { projectApiKey } from "./api-key.ts";
import { canSendVolunteerInvitation } from "./authorization.ts";

type InvitationResponse =
  | { outcome: "invitation-sent"; email: string }
  | { outcome: "access-activated"; email: string };

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function respond(body: InvitationResponse | { code: string }, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * An Auth invitation normally creates this row through the auth.users trigger.
 * Upserting makes approval resilient if that trigger is delayed or a previous
 * partial invitation left the profile absent. Checking the returned row also
 * prevents an empty profile update from looking like successful access.
 */
async function activateVolunteerProfile(
  adminClient: ReturnType<typeof createClient>,
  values: { id: string; name: string; email: string; role: string; approvedBy: string },
) {
  const { data, error } = await adminClient
    .from("profiles")
    .upsert({
      id: values.id,
      display_name: values.name,
      email: values.email,
      role: values.role,
      status: "active",
      approved_at: new Date().toISOString(),
      approved_by: values.approvedBy,
    }, { onConflict: "id" })
    .select("id, role, status")
    .maybeSingle();

  return !error
    && data?.id === values.id
    && data.role === values.role
    && data.status === "active";
}

/**
 * Creates a private Auth invitation only after independently verifying that the
 * requester is an active coordinator or administrator. The service-role key
 * never leaves this function and the browser cannot choose the role, email,
 * or profile being granted access.
 */
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ code: "method-not-allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const environment = {
    SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY"),
    SUPABASE_PUBLISHABLE_KEYS: Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"),
    SUPABASE_SECRET_KEYS: Deno.env.get("SUPABASE_SECRET_KEYS"),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  };
  const publishableKey = projectApiKey(environment, "SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const serviceRoleKey = projectApiKey(environment, "SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) return respond({ code: "server-misconfigured" }, 500);
  if (!authorization?.startsWith("Bearer ")) return respond({ code: "unauthorized" }, 401);

  let body: { interestId?: unknown; name?: unknown; email?: unknown };
  try {
    body = await request.json();
  } catch {
    return respond({ code: "invalid-request" }, 400);
  }
  const directInvite = body.interestId === undefined;
  if (!directInvite && !isUuid(body.interestId)) return respond({ code: "invalid-request" }, 400);
  if (directInvite && (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 160 || typeof body.email !== "string" || !/^\S+@\S+\.\S+$/.test(body.email.trim()))) return respond({ code: "invalid-request" }, 400);

  const callerClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return respond({ code: "unauthorized" }, 401);

  const callerId = userData.user.id;
  // Read the caller through their authenticated session. This is allowed by the
  // profile's own-row policy and avoids reporting a server-client issue as a
  // mistaken role denial.
  const { data: caller, error: callerError } = await callerClient
    .from("profiles")
    .select("id, role, status")
    .eq("id", callerId)
    .maybeSingle();

  if (callerError || !canSendVolunteerInvitation(caller)) {
    return respond({ code: "forbidden" }, 403);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let interest: { id: string; name: string; email: string; status: string } | null = null;
  if (!directInvite) {
    // The already-authorized coordinator can read the interest they are
    // reviewing. Keep this read on their session so a server-client problem
    // cannot make an existing interest look missing.
    const result = await callerClient.from("interest_submissions").select("id, name, email, status").eq("id", body.interestId).maybeSingle();
    interest = result.data;
    if (result.error || !interest) return respond({ code: "interest-not-found" }, 404);
    if (interest.status !== "submitted" && interest.status !== "reviewing") return respond({ code: "interest-not-ready" }, 409);
  }

  const email = (directInvite ? body.email as string : interest!.email).trim().toLowerCase();
  const name = (directInvite ? body.name as string : interest!.name).trim();
  const { data: existingProfile, error: profileLookupError } = await callerClient
    .from("profiles")
    .select("id, role, status")
    .eq("email", email)
    .maybeSingle();
  if (profileLookupError) return respond({ code: "profile-activation-failed" }, 500);

  if (existingProfile && directInvite) return respond({ code: "auth-account-exists" }, 409);
  if (
    existingProfile
    && interest
    && existingProfile.status === "active"
    && (existingProfile.role === "volunteer" || existingProfile.role === "coordinator" || existingProfile.role === "admin")
  ) {
    const { error: reviewError } = await callerClient.rpc("review_interest_submission", {
      p_interest_id: interest.id,
      p_status: "approved",
      p_decision_note: null,
    });
    if (reviewError) return respond({ code: "profile-activation-failed" }, 500);
    return respond({ outcome: "access-activated", email });
  }

  if (existingProfile) {
    const activated = await activateVolunteerProfile(adminClient, {
      id: existingProfile.id,
      name,
      email,
      role: existingProfile.role === "prospect" ? "volunteer" : existingProfile.role,
      approvedBy: callerId,
    });
    if (!activated) return respond({ code: "profile-activation-failed" }, 500);

    const { error: reviewError } = await adminClient
      .from("interest_submissions")
      .update({ status: "approved", reviewed_by: callerId, reviewed_at: new Date().toISOString() })
      .eq("id", interest.id);
    if (reviewError) return respond({ code: "profile-activation-failed" }, 500);

    return respond({ outcome: "access-activated", email });
  }

  const requestOrigin = request.headers.get("Origin");
  const allowedOrigins = new Set([
    "https://altar.lighthouseprayerroom.org",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);
  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) return respond({ code: "invalid-request" }, 400);
  const redirectTo = `${requestOrigin}/portal`;
  const { data: invitation, error: invitationError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
    redirectTo,
  });
  if (invitationError || !invitation.user) {
    if (invitationError?.message.toLowerCase().includes("already registered")) {
      return respond({ code: "auth-account-exists" }, 409);
    }
    return respond({ code: "email-delivery-failed" }, 502);
  }

  const activated = await activateVolunteerProfile(adminClient, {
    id: invitation.user.id,
    name,
    email,
    role: "volunteer",
    approvedBy: callerId,
  });
  if (!activated) return respond({ code: "profile-activation-failed" }, 500);

  if (interest) {
    const { error: reviewError } = await adminClient
      .from("interest_submissions")
      .update({ status: "approved", reviewed_by: callerId, reviewed_at: new Date().toISOString() })
      .eq("id", interest.id);
    if (reviewError) return respond({ code: "profile-activation-failed" }, 500);
  }

  return respond({ outcome: "invitation-sent", email });
});
