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
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    // // detect real PWA mode
    // const isStandalone =
    //   window.matchMedia("(display-mode: standalone)").matches ||
    //   (window.navigator as any).standalone === true;

    // // detect iOS Safari specifically (not Chrome)
    // const isSafari =
    //   /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // if (isIOS && isSafari && !isStandalone) {
    //   alert("📲 Please 'Add to Home Screen' to enable notifications");
    //   return;
    // }

    if (!("Notification" in window)) { alert("Browser does not support notifications"); return; }
    if (!("serviceWorker" in navigator)) { alert("Service Worker not supported"); return; }
    if (!("PushManager" in window)) { alert("Push not supported"); return; }

    console.log("permission:", Notification.permission);

    if (Notification.permission !== "granted") {
      await Notification.requestPermission();
    }
    
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { alert("Permission denied"); return; }

    // ✅ Get user on CLIENT side (this works)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Not logged in"); return; }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });

    console.log("✅ Subscribed:", subscription);

    // Send user_id along with subscription
    const subJson = subscription.toJSON();
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, endpoint: subJson.endpoint, keys: subJson.keys }),
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