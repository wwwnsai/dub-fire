"use client"

import Layout from "@/component/Layout" // Assuming you'll use this later
import Image from "next/image"
import BackButton from "@/component/buttons/BackButton";
import pfp from '@/photo/pfp.jpg' // Fallback profile picture
import InfoCards from "@/component/cards/InfoCards";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Profile } from "@/lib/types/users";


export default function Page() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // This function will run immediately
      const fetchData = async () => {
        // 1. Actively get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Error getting session:", sessionError.message);
          setLoading(false);
          return;
        }

        if (session) {
          // 2. We have a session, fetch the user and profile
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
            setProfile(profileData);
          }
          setLoading(false); // 3. Set loading false *after* data is fetched
        } else {
          // 4. No session, redirect to login
          setLoading(false);
          router.push("/login");
        }
      };

      fetchData();

      // 5. Still listen for future changes (like logging out)
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === "SIGNED_OUT") {
            // If the user logs out (e.g., in another tab), redirect
            setProfile(null);
            setUser(null);
            router.push("/login");
          }
        }
      );

      // 6. Cleanup the listener
      return () => {
        authListener.subscription.unsubscribe();
      };
    }, [router]);

    type InfoItem = { title: string; description: string };
    type InfoCard = Record<string, InfoItem>;

    const info: InfoCard[] = [
        {
        "1": {
            title: "Username",
            description: loading ? "Loading..." : profile?.username || "No Username"
        },
        "2": {
            title: "Email",
            description: loading ? "Loading..." : user?.email || "No Email"
        }
        },
        {
        "1": {
            title: "Old Password",
            description: ""
        },
        "2": {
            title: "New Password",
            description: ""
        },
        "3": {
            title: "Confirm Password",
            description: ""
        }
        },
        {
        "1": {
            title: "Email Notification",
            description: "Switch"
        }
        },
        {
        "1": {
            title: "Logout",
            description: "" 
        }
        }
    ]

  return (
    <main className="min-h-screen flex flex-col bg-background-light px-6 pt-6 pb-4">
      <div className="grid grid-cols-3 items-center mb-4">
        <button
          className="flex justify-start"
          onClick={() => window.history.back()}
        >
          <BackButton color="orange" />
        </button>

        <h1 className="justify-self-center sen-regular text-xl text-text-secondary">
          Profile
        </h1>

      </div>
      <div className="flex flex-col items-center justify-center mt-8">
        <div className="w-28 h-28 relative rounded-full overflow-hidden">
          <Image
            src={profile?.avatar_url || pfp}
            alt="User Profile Picture"
            fill
            className="object-cover"
            sizes="7rem"
          />
        </div>
        <button
          className="flex justify-center items-center bg-secondary-beige w-20 h-6 mt-6 rounded-full hover:cursor-pointer"
          onClick={() => alert('Change profile picture functionality coming soon!')}
        >
          <p className="sen-regular text-secondary-light text-sm">change</p>
        </button>
      </div>
      <div className="mt-10">
        <InfoCards infoData={info} />
      </div>
    </main>
  )
}