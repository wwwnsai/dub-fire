import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { user_id, endpoint, keys } = await req.json();

  if (!user_id) {
    return Response.json({ error: "No user_id" }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id,
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