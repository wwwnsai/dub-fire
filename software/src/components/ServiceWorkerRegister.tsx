"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/custom-sw.js")
        .then(() => console.log("✅ SW registered"))
        .catch((err) => console.error("❌ SW failed:", err));
    }
  }, []);

  return null; // no UI
}
