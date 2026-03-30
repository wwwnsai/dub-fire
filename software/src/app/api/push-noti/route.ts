import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  "mailto:your@email.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  // Require authentication before dispatching push notifications
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

  const { title, body } = await req.json();

  const { data: subs, error } = await supabaseServer
    .from("push_subscriptions")
    .select(`
      user_id,
      endpoint,
      p256dh,
      auth,
      profiles!inner (
        id,
        push_noti
      )
    `)
    .eq("profiles.push_noti", true);

  if (error) {
    console.error("❌ DB query error:", error.message ?? "Unknown error");
    return Response.json({ error: "Failed to retrieve subscriptions" }, { status: 500 });
  }

  if (subs) {
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify({ title, body })
          );
        } catch (err) {
          console.error("❌ Push error:", err);
        }
      })
    );
  }

  return Response.json({ success: true });
}