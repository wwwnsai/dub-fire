// components/Layout.tsx
import { ReactNode } from "react";
import NotificationBadge, { Notification } from "./NotificationBadge";
import BottomNav from "./BottomNav";
import Image from "next/image";
import pfp from "../photo/pfp.jpg";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Profile } from "@/lib/types/users";
import { eventBus } from "@/lib/eventBus";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const router = useRouter();
  const [, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError.message);
      } else if (session) {
        const currentUser = session.user;
        console.log("Current User:", currentUser);
        setUser(currentUser);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile Error:", profileError.message);
        } else {
          console.log("Profile Data:", profileData);
          setProfile(profileData);
        }
      }
      setLoading(false);
    };

    fetchData();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN") {
          setUser(session!.user);
          fetchData();
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // Listen to fire alert and status change events
  useEffect(() => {
    const handleFireAlert = (event: {
      status: string;
      location: string;
      severity: string;
      time: string;
    }) => {
      const message =
        event.status === "fire"
          ? `🔥 Fire detected at ${event.location || "Unknown Location"}`
          : `✅ Fire cleared at ${event.location || "Unknown Location"}`;

      const newNotification: Notification = {
        id: `fire-${Date.now()}-${Math.random()}`,
        message,
        timestamp: event.time || new Date().toISOString(),
        type: "fire",
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    };

    const handleStatusChange = (event: {
      locationId: string;
      fromStatus: "fire" | "non-fire";
      toStatus: "fire" | "non-fire";
      location: {
        lat: number;
        lng: number;
        name?: string;
        severity?: "non-fire" | "high";
      };
    }) => {
      const { fromStatus, toStatus, location } = event;

      // Only show notifications for significant transitions
      if (
        (fromStatus === "non-fire" && toStatus === "fire") ||
        (fromStatus === "fire" && toStatus === "non-fire")
      ) {
        // Get location name, but filter out status-related names
        let locationName = location.name || "Unknown Location";

        // If name is a status message, use a default location name based on coordinates
        if (
          locationName === "Fire Cleared" ||
          locationName === "Fire Detected" ||
          locationName === "Fire Detected - Test Alert"
        ) {
          // Default ECC location coordinates
          if (
            Math.abs(location.lat - 13.729528) < 0.001 &&
            Math.abs(location.lng - 100.775371) < 0.001
          ) {
            locationName = "ECC-806";
          } else {
            locationName = `Location (${location.lat.toFixed(
              4
            )}, ${location.lng.toFixed(4)})`;
          }
        }

        const message =
          toStatus === "fire"
            ? `🔥 Fire detected at ${locationName}`
            : `✅ Fire cleared at ${locationName}`;

        const newNotification: Notification = {
          id: `status-${Date.now()}-${Math.random()}`,
          message,
          timestamp: new Date().toISOString(),
          type: "status-change",
        };

        setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50
      }
    };

    // Subscribe to events
    eventBus.on("fire:alert", handleFireAlert);
    eventBus.on("fire:status-changed", handleStatusChange);

    // Cleanup
    return () => {
      eventBus.off("fire:alert", handleFireAlert);
      eventBus.off("fire:status-changed", handleStatusChange);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      {/* Top Navbar */}
      <header className="flex fixed top-0 left-0 right-0 bg-background-light z-50">
        <button
          className={`w-3/4 flex justify-start items-center px-4 pt-6 pb-4`}
          onClick={() =>
            profile ? router.push("/profile") : router.push("/login")
          }
        >
          {profile && (
            <div className="w-8 h-8 relative rounded-full overflow-hidden">
              <Image
                src={profile?.avatar_url || pfp}
                alt="User Profile Picture"
                fill
                className="object-cover"
              />
            </div>
          )}
          <span
            className={`${
              profile
                ? "sen-regular ml-2 text-text-primary"
                : "sen-medium text-primary-light bg-secondary-beige rounded-lg px-4 py-1"
            } text-md `}
          >
            {profile ? profile.username ?? profile.email : "Log In"}
          </span>
        </button>
        <div className="w-1/4 flex justify-end items-center pr-6 pt-6 pb-4">
          <NotificationBadge notifications={notifications} />
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
