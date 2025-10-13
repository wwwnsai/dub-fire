// components/BottomNav.tsx
import { Home, MapPin, Activity, Clock } from "lucide-react";
import Link from "next/link";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-inner flex justify-around py-2">
      <Link href="/" className="flex flex-col items-center text-orange-500">
        <Home size={24} />
        <span className="text-xs">Home</span>
      </Link>
      <Link href="/map" className="flex flex-col items-center text-gray-600">
        <MapPin size={24} />
        <span className="text-xs">Map</span>
      </Link>
      <Link
        href="/activity"
        className="flex flex-col items-center text-gray-600"
      >
        <Activity size={24} />
        <span className="text-xs">Status</span>
      </Link>
      <Link
        href="/history"
        className="flex flex-col items-center text-gray-600"
      >
        <Clock size={24} />
        <span className="text-xs">History</span>
      </Link>
    </nav>
  );
};

export default BottomNav;
