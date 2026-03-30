import { supabase } from "@/lib/supabaseClient";

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function requestNotificationPermission() {
  try {
    if (!("Notification" in window)) {
      alert("Browser does not support notifications");
      return false;
    }

    if (!("serviceWorker" in navigator)) {
      alert("Service Worker not supported");
      return false;
    }

    if (!("PushManager" in window)) {
      alert("Push not supported");
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      alert("Permission denied");
      return false;
    }

    // get user back
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      alert("Not logged in");
      return false;
    }

    const accessToken = session.access_token;

    const registration = await navigator.serviceWorker.ready;

    // reuse existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error("VAPID public key is not configured");
        return false;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    console.log("✅ Subscribed:", subscription);

    const subJson = subscription.toJSON();

    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      console.error("❌ Subscription missing required keys");
      return false;
    }

    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      }),
    });

    if (!res.ok) {
      console.error("❌ Subscribe failed:", await res.json());
      return false;
    }

    return true;
  } catch (err) {
    console.error("Push error:", err);
    return false;
  }
}