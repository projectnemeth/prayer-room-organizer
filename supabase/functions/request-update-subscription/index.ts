// The public marketing list now lives in Kit. Keep this endpoint so older
// cached clients receive an explicit response without creating new subscribers
// in the separate legacy Supabase list.
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers });
  }

  return Response.json(
    {
      error: "This signup has moved to Kit.",
      signup_url: "https://lighthouse-prayer-room.kit.com/f5260306b6",
    },
    { status: 410, headers },
  );
});
