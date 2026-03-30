self.addEventListener("push", function (event) {
  console.log("🔥 PUSH RECEIVED");

  let data = { title: "Notification", body: "" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn("⚠️ Not JSON, fallback to text");

      data = {
        title: "Notification",
        body: event.data.text(),
      };
    }
  }

  const options = {
    body: data.body,
    icon: "/vercel.svg",
    badge: "/vercel.svg",
  };

  if (data.tag && typeof data.tag === "string" && data.tag.length > 0) {
    options.tag = data.tag;
  }

  if (data.requireInteraction === true) {
    options.requireInteraction = true;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});