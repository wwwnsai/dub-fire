// components/Layout.tsx
import { ReactNode } from "react";
import NotificationBadge from "./NotificationBadge";
import BottomNav from "./BottomNav";
import Image from "next/image";
import pfp from "../photo/pfp.jpg";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Profile } from "@/lib/types/users";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
          console.log("Auth Event:", event);
          if (session) {
              console.log("Session:", session);
              const currentUser = session.user;
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
          } else {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
      }
      );

      return () => {
          authListener.subscription.unsubscribe();
      };
  }, [router]);
  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      {/* Top Navbar */}
      <header className="flex fixed top-0 left-0 right-0 bg-background-light z-50">
        <button 
          className={`w-3/4 flex justify-start items-center px-4 pt-6 pb-4`}
          onClick={() => profile ? router.push("/profile") : router.push("/login")}
        >
          {profile && (<div className="w-8 h-8 relative rounded-full overflow-hidden">
            <Image
              src={profile?.avatar_url || pfp}
              alt="User Profile Picture"
              fill
              className="object-cover"
            />
          </div>)}
          <span 
            className={`${profile ? 'sen-regular ml-2 text-text-primary' : 'sen-medium text-primary-light bg-secondary-beige rounded-lg px-4 py-1'} text-md `}
          >
            {profile?.username || "Log In"}
          </span>
        </button>
        <div className="w-1/4 flex justify-end items-center pr-6 pt-6 pb-4">
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
