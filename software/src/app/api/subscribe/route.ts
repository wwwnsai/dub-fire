// app/api/subscribe/route.ts
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { user_id, endpoint, keys } = await req.json();

  if (!user_id) {
    return Response.json({ error: "No user_id provided" }, { status: 401 });
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return Response.json({ error: "Invalid subscription data" }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("❌ Insert error:", error);
    return Response.json({ error }, { status: 500 });
  }

  console.log("✅ Saved subscription to DB");
  return Response.json({ success: true });
}