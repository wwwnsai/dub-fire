/// <reference lib="webworker" />
export {};

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event: PushEvent) => {
  const defaultData = {
    title: "Notification",
    body: "",
  };

  const data = (() => {
    if (!event.data) {
      return defaultData;
    }

    try {
      const parsed = event.data.json() as {
        title?: unknown;
        body?: unknown;
        [key: string]: unknown;
      };

      return {
        title:
          typeof parsed.title === "string" && parsed.title.trim().length > 0
            ? parsed.title
            : defaultData.title,
        body:
          typeof parsed.body === "string"
            ? parsed.body
            : defaultData.body,
      };
    } catch (error) {
      console.error("Push event data parsing failed:", error);
      return defaultData;
    }
  })();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.png",
    })
  );
});
