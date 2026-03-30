import webpush, { PushSubscription } from "web-push";
import { subscriptions } from "@/lib/subscriptions";

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
