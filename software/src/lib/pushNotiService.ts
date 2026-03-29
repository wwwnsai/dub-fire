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
    // ✅ iOS check (correct)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

    if (isIOS && !isStandalone) {
      alert("📲 Please 'Add to Home Screen' to enable notifications");
      return;
    }

    if (!("Notification" in window)) {
      alert("Browser does not support notifications");
      return;
    }

    if (!("serviceWorker" in navigator)) {
      alert("Service Worker not supported");
      return;
    }

    if (!("PushManager" in window)) {
      alert("Push not supported");
      return;
    }

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      alert("Permission denied");
      return;
    }

    // Wait for SW ready
    const registration = await navigator.serviceWorker.ready;

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });

    console.log("✅ Subscribed:", subscription);

    await fetch("/api/subscribe", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
    });

    alert("✅ Sent to /api/subscribe");

  } catch (err) {
    console.error("Push error:", err);
  }
}