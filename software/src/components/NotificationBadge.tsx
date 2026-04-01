"use client";
import { useState, useEffect, useRef } from "react";
import NotiIcon from "./icons/NotiIcon";
import { useNotificationStore } from "@/lib/store/useNotificationStore";

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  type?: "fire" | "status-change" | "info";
  read?: boolean; 
}

interface NotificationBadgeProps {
  notifications: Notification[];
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  notifications = [],
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const unreadCount = useNotificationStore(
    (s) => s.notifications.filter((n) => !n.read).length
  );

  const toggle = () => {
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (open) {
      markAllRead();
    }
  }, [open, markAllRead]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 🔔 Bell */}
      <button onClick={toggle} className="relative">
        <NotiIcon />

        {/* 🔴 UNREAD BADGE */}
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#BB2234] text-white text-xs sen-semibold flex items-center justify-center rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 📥 Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white/90 border rounded-xl shadow-[0px_4px_20px_0px_rgba(0,0,0,0.20)] backdrop-blur-[2px] z-50 max-h-96 overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="p-3 sen-semibold flex justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs text-gray-500">
                {unreadCount} new
              </span>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto">
            {notifications.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {notifications.map((note) => {
                  return (
                    <li
                      key={note.id}
                      className={`
                        px-4 py-3 text-sm transition-colors
                        ${!note.read ? "bg-white/50 border-l-4 border-primary-light" : "bg-transparent"}
                        hover:bg-gray-50/75
                      `}
                    >
                      <div className="flex flex-col gap-1">
                        <p className="text-gray-900 sen-medium">
                          {note.message}
                        </p>
                        <p className="text-xs text-gray-500 sen-regular">
                          {formatTime(note.timestamp)}
                        </p>
                      </div>
                    </li>
                )})}
              </ul>
            ) : (
              <div className="px-4 py-8 text-sm text-gray-500 sen-medium text-center">
                No notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBadge;