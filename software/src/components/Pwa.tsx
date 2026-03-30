"use client";

import React, { useEffect } from "react";

export default function Pwa() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("✅ Service Worker registered:", reg);
        })
        .catch((err) => {
          console.error("❌ SW registration failed:", err);
        });
    }
  }, []);

  return null;
}