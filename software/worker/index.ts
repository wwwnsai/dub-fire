/// <reference lib="webworker" />
export {};

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event: any) => {
  console.log("🔥 PUSH RECEIVED");

  event.waitUntil(
    self.registration.showNotification("TEST", {
      body: "Push works",
    })
  );
});