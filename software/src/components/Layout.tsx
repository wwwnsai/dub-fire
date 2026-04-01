"use client";

import { ReactNode, useEffect, useState } from "react";
import NotificationBadge, { Notification } from "./NotificationBadge";
import BottomNav from "./BottomNav";
import { supabase } from "@/lib/supabaseClient";
import { Profile } from "@/lib/types/users";
import { eventBus } from "@/lib/eventBus";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Handle notifications
  useEffect(() => {
    let lastMessage = "";

    function addNotification(message: string, type: Notification["type"]) {
      if (message === lastMessage) return;
      lastMessage = message;

      const newNoti: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        message,
        timestamp: new Date().toISOString(),
        type,
      };

      setNotifications((prev) => [newNoti, ...prev].slice(0, 50));
    }

    const handleStatusChange = (event: any) => {
      const { fromStatus, toStatus, location } = event;

      if (fromStatus === toStatus) return;

      const locationName = location?.name || "Unknown";

      const message =
        toStatus === "fire"
          ? `🔥 Fire detected at ${locationName}`
          : `✅ Fire cleared at ${locationName}`;

      addNotification(message, "status-change");
    };

    eventBus.on("fire:status-changed", handleStatusChange);

    return () => {
      eventBus.off("fire:status-changed", handleStatusChange);
    };
  }, []);

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