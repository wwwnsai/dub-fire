// /// <reference lib="webworker" />
// export {};

// declare const self: ServiceWorkerGlobalScope;

// self.addEventListener("push", (event: any) => {
//   event.waitUntil(
//     self.registration.showNotification("TEST", {
//       body: "Push is working",
//     })
//   );
// });

// self.addEventListener("push", (event: any) => {
//   console.log("🔥 PUSH RECEIVED");

//   let data = { title: "Default title", body: "Default body" };

//   if (event.data) {
//     try {
//       data = event.data.json();
//     } catch (err) {
//       console.error("Push parse error:", err);
//     }
//   }

//   event.waitUntil(
//     self.registration.showNotification(data.title, {
//       body: data.body,
//       icon: "/icon.png",
//     })
//   );
// });

/// <reference lib="webworker" />
export {};

declare const self: ServiceWorkerGlobalScope;

console.log("🔥 CUSTOM WORKER LOADED");

self.addEventListener("push", (event: any) => {
  console.log("🔥 PUSH RECEIVED");

  event.waitUntil(
    self.registration.showNotification("TEST", {
      body: "Push works",
    })
  );
});