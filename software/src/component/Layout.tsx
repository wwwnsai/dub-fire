// components/Layout.tsx
import { ReactNode } from "react";
import NotificationBadge from "./NotificationBadge";
import BottomNav from "./BottomNav";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 🔹 Top Navbar */}
      <header className="fixed top-0 left-0 right-0 bg-transparent z-50">
        <div className="flex justify-end items-center px-6 py-6">
          <NotificationBadge
            count={2}
            notifications={[
              "bullshit1",
              "bullshit2",
            ]}
          />
        </div>

      </header>

      {/* 🔹 Main Content (pushed down from top + up from bottom) */}
      <main className="flex-1 pt-16 pb-14 px-4">{children}</main>

      {/* 🔹 Bottom Navbar */}
      <BottomNav />
    </div>
  );
};

export default Layout;
