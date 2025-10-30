// components/NotificationBadge.tsx
"use client";
import { useState } from "react";
import { Bell } from "lucide-react";

import NotiIcon from "./icons/NotiIcon";

interface NotificationBadgeProps {
  count: number;
  notifications?: string[]; // you can replace with a real type later
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  notifications = [],
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setOpen(!open)}
        className="relative focus:outline-none"
      >
        <NotiIcon  />
        {count > 0 && (
          <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#BB2234] text-white text-xs sen-semibold px-1 rounded-full">
            {count}
          </span>
        )}
      </button>

      {/* Dropdown box */}
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-50">
          <div className="p-2 font-semibold border-b">Notifications</div>
          <ul className="max-h-60 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((note, idx) => (
                <li
                  key={idx}
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {note}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-gray-500">
                No notifications
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBadge;
