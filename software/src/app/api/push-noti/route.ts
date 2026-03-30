import webpush from "web-push";
import { supabase } from "@/lib/supabaseClient";

webpush.setVapidDetails(
  "mailto:your@email.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  const { title, body } = await req.json();

  const { data: subs, error } = await supabase
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

  
  if (subs) {
    console.log(
      "📦 SUBS:",
      subs.map((s) => ({
        user_id: s.user_id,
        push_noti: (s.profiles as any)?.push_noti,
      }))
    );
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
  } else {
    console.info("❌ No valid subscriptions found:", error);
  }

  return Response.json({ success: true });
}