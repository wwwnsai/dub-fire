"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import HomeIcon from "./icons/HomeIcon";
import DashboardIcon from "./icons/DashboardIcon";
import SettingsIcon from "./icons/SettingsIcon";
import MapIcon from "./icons/MapIcon";

const BottomNav = () => {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    `flex flex-col items-center transition-colors duration-300 ease-in-out ${
      pathname === path ? "text-blue-500" : "text-gray-600"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-sm flex h-16">
      {/* Home */}
      <div className="w-1/4 pt-4">
        <Link href="/home" className={linkClass("/home")}>
          <HomeIcon active={pathname === "/home"} />
        </Link>
      </div>

      {/* Camera */}
      <div className="w-1/4 pt-4">
        <Link href="/camera" className={linkClass("/camera")}>
          <DashboardIcon active={pathname === "/camera"} />
        </Link>
      </div>

      {/* Map */}
      <div className="w-1/4 pt-4">
        <Link href="/map" className={linkClass("/map")}>
          <MapIcon active={pathname === "/map"} />
        </Link>
      </div>

      {/* Settings */}
      <div className="w-1/4 pt-4">
        <Link href="/settings" className={linkClass("/settings")}>
          <SettingsIcon active={pathname === "/settings"} />
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
