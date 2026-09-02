import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function configuredOrigins(): string[] {
  return (Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("SITE_URL") ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin")?.replace(/\/$/, "");
  const allowed = configuredOrigins();
  return origin && allowed.includes(origin)
    ? { ...jsonHeaders, "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" }
    : jsonHeaders;
}

function response(request: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

function opaqueToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isEmail(value: unknown): value is string {
  return typeof value === "string" && value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function sendConfirmationEmail(input: {
  confirmationToken: string;
  email: string;
  unsubscribeToken: string;
}): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  const siteUrl = Deno.env.get("SITE_URL")?.replace(/\/$/, "");

  if (!resendKey || !from || !siteUrl) {
    throw new Error("Missing RESEND_API_KEY, EMAIL_FROM, or SITE_URL.");
  }

  const confirmUrl = `${siteUrl}/updates/confirm?token=${encodeURIComponent(input.confirmationToken)}`;
  const unsubscribeUrl = `${siteUrl}/updates/unsubscribe?token=${encodeURIComponent(input.unsubscribeToken)}`;
  const emailPayload = {
    from,
    to: [input.email],
    subject: "Confirm your Altar Initiative updates",
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2421;line-height:1.55"><p>The Altar Initiative</p><h1>Confirm your email updates</h1><p>Someone asked to receive gathering updates and daily prayer focuses at this email address. Please confirm only if that was you.</p><p><a href="${confirmUrl}" style="display:inline-block;background:#3f5f5b;color:#f5f1e8;padding:12px 18px;text-decoration:none">Confirm email updates</a></p><p>This link expires in 24 hours. If you did not make this request, you can ignore this email.</p><p style="font-size:12px"><a href="${unsubscribeUrl}">Unsubscribe from Altar Initiative updates</a></p></body></html>`,
    text: `Confirm Altar Initiative updates: ${confirmUrl}\n\nThis link expires in 24 hours. If you did not make this request, ignore this email.\n\nUnsubscribe: ${unsubscribeUrl}`,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };

  const providerResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `altar-update-confirmation-${await sha256(input.confirmationToken)}`,
    },
    body: JSON.stringify(emailPayload),
  });

  if (!providerResponse.ok) {
    throw new Error(`Resend rejected confirmation email (${providerResponse.status}).`);
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return response(request, { error: "Method not allowed" }, 405);

  const origin = request.headers.get("origin")?.replace(/\/$/, "");
  if (origin && !configuredOrigins().includes(origin)) return response(request, { error: "Origin not allowed" }, 403);

  let payload: { email?: unknown; website?: unknown };
  try {
    payload = await request.json();
  } catch {
    return response(request, { accepted: true }, 202);
  }

  // A filled honeypot receives the same success response but never writes or sends.
  if (typeof payload.website === "string" && payload.website.trim()) return response(request, { accepted: true }, 202);
  if (!isEmail(payload.email)) return response(request, { accepted: true }, 202);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const pepper = Deno.env.get("PUBLIC_FORM_RATE_LIMIT_PEPPER");
  if (!supabaseUrl || !serviceRoleKey || !pepper) {
    console.error("Update subscription function is missing required server configuration.");
    return response(request, { accepted: true }, 202);
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const source = `${request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown"}|${request.headers.get("user-agent") ?? "unknown"}`;
  const confirmationToken = opaqueToken();
  const unsubscribeToken = opaqueToken();
  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: shouldSend, error } = await client.rpc("request_update_subscription_confirmation", {
    p_email: normalizedEmail,
    p_confirmation_token_hash: await sha256(confirmationToken),
    p_unsubscribe_token_hash: await sha256(unsubscribeToken),
    p_source_hash: await sha256(`${pepper}|${source}`),
  });

  if (error) {
    // Do not log the submitted email. Generic success prevents address probing.
    console.error("Update subscription request could not be recorded.", error.code);
    return response(request, { accepted: true }, 202);
  }
  if (!shouldSend) return response(request, { accepted: true }, 202);

  try {
    await sendConfirmationEmail({ confirmationToken, email: normalizedEmail, unsubscribeToken });
  } catch (error) {
    console.error("Update confirmation delivery failed.", error instanceof Error ? error.message : "unknown error");
  }

  return response(request, { accepted: true }, 202);
});
