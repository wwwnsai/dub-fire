self.addEventListener("push", function (event) {
  console.log("🔥 PUSH RECEIVED");

  let data = { title: "TEST", body: "Push works" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn("⚠️ Not JSON, fallback to text");

      data = {
        title: "TEST",
        body: event.data.text(),
      };
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/vercel.svg",
      badge: "/vercel.svg",
      tag: "test",
      requireInteraction: true,
    })
  );
});