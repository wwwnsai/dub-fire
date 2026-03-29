import webpush, { PushSubscription } from "web-push";
import { subscriptions } from "@/lib/subscriptions";

webpush.setVapidDetails(
  "mailto:your@email.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  const { title, body } = await req.json();

  await Promise.all(
    subscriptions.map((sub: any) => {
      const pushSub: PushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };

      return webpush.sendNotification(
        pushSub,
        JSON.stringify({ title, body })
      );
    })
  );

  return Response.json({ success: true });
}