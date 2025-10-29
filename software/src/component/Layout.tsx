// components/Layout.tsx
import { ReactNode } from "react";
import NotificationBadge from "./NotificationBadge";
import BottomNav from "./BottomNav";
import Image from "next/image";
import pfp from "../photo/pfp.jpg";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      {/* 🔹 Top Navbar */}
      <header className="flex fixed top-0 left-0 right-0 bg-transparent z-50">
        <button 
          className="w-1/2 flex justify-start items-center px-4 py-8"
          onClick={() => window.location.href = '/profile'}
        >
          <div className="w-8 h-8 relative rounded-full overflow-hidden">
            <Image
              src={pfp}
              alt="User Profile Picture"
              fill
              className="object-cover"
            />
          </div>
          <span className="ml-2 text-md sen-regular text-text-primary">John Doe</span>
        </button>
        <div className="w-1/2 flex justify-end items-center px-6 py-8">
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
      <main className="flex-1 pt-20 pb-14 px-4">{children}</main>

      {/* 🔹 Bottom Navbar */}
      <BottomNav />
    </div>
  );
};

export default Layout;
