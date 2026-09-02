import { createClient } from "npm:@supabase/supabase-js@2";

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function allowedOrigins(): string[] {
  return (Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("SITE_URL") ?? "")
    .split(",").map((value) => value.trim().replace(/\/$/, "")).filter(Boolean);
}

function cors(request: Request): HeadersInit {
  const origin = request.headers.get("origin")?.replace(/\/$/, "");
  return origin && allowedOrigins().includes(origin)
    ? { ...headers, "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" }
    : headers;
}

function json(request: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: cors(request) });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);
  const origin = request.headers.get("origin")?.replace(/\/$/, "");
  if (origin && !allowedOrigins().includes(origin)) return json(request, { error: "Origin not allowed" }, 403);

  let token: unknown;
  try { token = (await request.json()).token; } catch { return json(request, { confirmed: false }); }
  if (typeof token !== "string" || token.length < 40 || token.length > 128) return json(request, { confirmed: false });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json(request, { confirmed: false }, 503);

  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.rpc("confirm_update_subscription", { p_confirmation_token_hash: await sha256(token) });
  if (error) {
    console.error("Update subscription confirmation failed.", error.code);
    return json(request, { confirmed: false }, 503);
  }
  return json(request, { confirmed: data === true });
});
