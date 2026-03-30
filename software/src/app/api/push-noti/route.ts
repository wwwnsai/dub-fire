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
      endpoint,
      p256dh,
      auth,
      profiles(push_noti)
    `);

  if (error) {
    console.error(error);
    return Response.json({ error }, { status: 500 });
  }

  console.log("📦 ALL SUBS:", subs);

  const validSubs = subs.filter(
    (sub) => (sub.profiles as any)?.push_noti === true
  );
  console.log("✅ VALID SUBS:", validSubs);

  await Promise.all(
    validSubs.map(async (sub) => {
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

        console.log("✅ Sent push");
      } catch (err) {
        console.error("❌ Push error:", err);
      }
    })
  );

  return Response.json({ success: true });
}