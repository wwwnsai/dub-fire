"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import HomeIcon from "./icons/HomeIcon";
import DashboardIcon from "./icons/LiveCamIcon";
import SettingsIcon from "./icons/SettingsIcon";
import MapIcon from "./icons/MapIcon";

const BottomNav = () => {
  const pathname = usePathname();
// test
  const linkClass = (path: string) =>
    `flex flex-col items-center transition-colors duration-300 ease-in-out ${
      pathname === path ? "text-blue-500" : "text-gray-600"
    }`;

  return (
    <nav 
      className="
        fixed bottom-5 left-4 right-4
        h-20 
        flex justify-center items-center 
        bg-white/70 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.20)] backdrop-blur-[2px] rounded-[20px]"
    >
      {/* Home */}
      <div className="w-1/4">
        <Link href="/home" className={linkClass("/home")}>
          <HomeIcon active={pathname === "/home"} />
        </Link>
      </div>

      {/* Camera */}
      <div className="w-1/4">
        <Link href="/camera" className={linkClass("/camera")}>
          <DashboardIcon active={pathname === "/camera"} />
        </Link>
      </div>

      {/* Map */}
      <div className="w-1/4">
        <Link href="/map" className={linkClass("/map")}>
          <MapIcon active={pathname === "/map"} />
        </Link>
      </div>

      {/* Settings */}
      <div className="w-1/4">
        <Link href="/settings" className={linkClass("/settings")}>
          <SettingsIcon active={pathname === "/settings"} />
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
