import webpush from "web-push";
import { supabase } from "@/lib/supabaseClient";

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails("mailto:your@email.com", publicKey, privateKey);
  return true;
}

export async function POST(req: Request) {
  if (!configureWebPush()) {
    return Response.json(
      { success: false, error: "VAPID keys are not configured" },
      { status: 503 }
    );
  }
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
