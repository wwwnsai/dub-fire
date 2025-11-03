// components/NotificationBadge.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import NotiIcon from "./icons/NotiIcon";

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  type?: "fire" | "status-change" | "info";
}

interface NotificationBadgeProps {
  notifications: Notification[];
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  notifications = [],
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const count = notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setOpen(!open)}
        className="relative focus:outline-none"
      >
        <NotiIcon />
        {count > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#BB2234] text-white text-xs sen-semibold flex items-center justify-center rounded-full">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown box */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-3 font-semibold border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <span>Notifications</span>
              {count > 0 && (
                <span className="text-xs text-gray-500 font-normal">
                  {count} {count === 1 ? "alert" : "alerts"}
                </span>
              )}
            </div>
          </div>
          <div className="overflow-y-auto">
            {notifications.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {notifications.map((note) => (
                  <li
                    key={note.id}
                    className={`px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${
                      note.type === "fire"
                        ? "bg-red-50 border-l-4 border-red-500"
                        : note.type === "status-change"
                        ? "bg-orange-50 border-l-4 border-orange-500"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-gray-900 font-medium">
                        {note.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(note.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <li className="px-4 py-8 text-sm text-gray-500 text-center">
                No notifications
              </li>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBadge;
