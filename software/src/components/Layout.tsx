"use client";

import { ReactNode, useEffect, useRef } from "react";
import NotificationBadge from "./NotificationBadge";
import BottomNav from "./BottomNav";
import { eventBus } from "@/lib/eventBus";
import { useNotificationStore } from "@/lib/store/useNotificationStore";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { notifications, add, setAll } = useNotificationStore();
  const lastMessageRef = useRef("");

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("notifications");
    if (saved) {
      setAll(JSON.parse(saved));
    }
  }, [setAll]);

  // Handle notifications
  useEffect(() => {
    function handleStatusChange(event: any) {
      const { fromStatus, toStatus, location } = event;

      if (fromStatus === toStatus) return;

      const locationName = location?.name || "Unknown";

      const message =
        toStatus === "fire"
          ? `🔥 Fire detected at ${locationName}`
          : `✅ Fire cleared at ${locationName}`;

      if (message === lastMessageRef.current) return;
      lastMessageRef.current = message;

      add({
        id: `${Date.now()}-${Math.random()}`,
        message,
        timestamp: new Date().toISOString(),
        type: "status-change",
      });
    }

    eventBus.on("fire:status-changed", handleStatusChange);

    return () => {
      eventBus.off("fire:status-changed", handleStatusChange);
    };
  }, [add]);

  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-end pr-6 pt-6 pb-4">
        <NotificationBadge notifications={notifications} />
      </header>

      {/* Main */}
      <main className="flex-1 pt-20 pb-28 px-4">{children}</main>

      {/* Bottom Nav */}
      <div className="px-4 w-full">
        <BottomNav />
      </div>
    </div>
  );
}