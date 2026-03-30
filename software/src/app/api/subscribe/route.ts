import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  // Verify user identity server-side via Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
    error: authError,
  } = await supabaseServer.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { endpoint, keys } = body;

  // Validate required fields
  if (!endpoint || typeof endpoint !== "string") {
    return Response.json({ error: "Invalid or missing endpoint" }, { status: 400 });
  }

  if (!keys || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") {
    return Response.json({ error: "Invalid or missing subscription keys" }, { status: 400 });
  }

  const { error } = await supabaseServer.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("❌ DB error:", error);
    return Response.json({ error }, { status: 500 });
  }

  return Response.json({ success: true });
}