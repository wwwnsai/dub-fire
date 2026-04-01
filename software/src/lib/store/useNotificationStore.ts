import { create } from "zustand";

export type Notification = {
  id: string;
  message: string;
  timestamp: string;
  type: "fire" | "status-change";
  read: boolean;
};

interface NotificationState {
  notifications: Notification[];
  add: (noti: Omit<Notification, "read">) => void;
  setAll: (notis: Notification[]) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  add: (noti) =>
    set((state) => {
      const updated = [
        { ...noti, read: false }, 
        ...state.notifications,
      ].slice(0, 10);

      localStorage.setItem("notifications", JSON.stringify(updated));
      return { notifications: updated };
    }),

  setAll: (notis) => set({ notifications: notis }),

  markAllRead: () =>
    set((state) => {
      const updated = state.notifications.map((n) => ({
        ...n,
        read: true,
      }));

      localStorage.setItem("notifications", JSON.stringify(updated));
      return { notifications: updated };
    }),

  unreadCount: () =>
    get().notifications.filter((n) => !n.read).length,
}));