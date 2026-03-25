"use client";

import EditIcon from '@/components/icons/EditIcon';
import Layout from '@/components/Layout'
import Image from "next/image"
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Profile } from "@/lib/types/users";
import pfp from '@/photo/pfp.jpg'
import Card from '@/components/cards/Card';

export default function page() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const [emailNotifications, setEmailNotifications] = useState(false);

    // fetching data and setting up listeners
    useEffect(() => {
        let profileChannel: RealtimeChannel | null = null;

        const fetchDataAndSubscribe = async () => {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error("Error getting session:", sessionError.message);
                setLoading(false);
                return;
            }

            if (session) {
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
                setLoading(false);

                profileChannel = supabase
                    .channel(`profile-${currentUser.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'profiles',
                            filter: `id=eq.${currentUser.id}`
                        },
                        (payload) => {
                            console.log('Profile change received!', payload);
                            setProfile(payload.new as Profile);
                        }
                    )
                    .subscribe();

            } else {
                setLoading(false);
                router.push("/login");
            }
        };

        fetchDataAndSubscribe();

        // Auth listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === "SIGNED_OUT") {
                    setProfile(null);
                    setUser(null);
                    router.push("/login");
                    if (profileChannel) {
                        supabase.removeChannel(profileChannel);
                    }
                }
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
            if (profileChannel) {
                supabase.removeChannel(profileChannel);
            }
        };
    }, [router]);

    // Sync email notification state with profile data
    useEffect(() => {
        if (profile) {
            setEmailNotifications(profile.email_noti);
        }
    }, [profile]);

    async function handleSwitchToggle() {
        if (!user) return; 

        const newStatus = !emailNotifications;

        setEmailNotifications(newStatus);

        // --- DATABASE UPDATE ---
        const [profileUpdate, subscriptionUpdate] = await Promise.all([
            supabase
                .from("profiles")
                .update({ email_noti: newStatus })
                .eq("id", user.id),
            
            supabase
                .from("profiles")
                .update({ is_active: newStatus })
                .eq("id", user.id)
        ]);
        
        if (profileUpdate.error) {
            console.error("Error updating profile:", profileUpdate.error.message);
            setEmailNotifications(!newStatus); 
        }

        if (subscriptionUpdate.error) {
            console.error("Error updating subscription:", subscriptionUpdate.error.message);
            setEmailNotifications(!newStatus); 
        }
    }

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
            "1": { title: "Old Password", description: "" },
            "2": { title: "New Password", description: "" },
            "3": { title: "Confirm Password", description: "" }
        },
        {
            "1": {
                title: "Email Notification",
                description: emailNotifications ? "On" : "Off"
            }
        },
        {
            "1": { title: "Logout", description: "" }
        }
    ]
  return (
    <Layout>
      <div className="mt-2">
        {/* <div className="mb-2">
          <h1 className="sen-regular text-xl text-text-secondary">
            Settings
          </h1>
        </div> */}
        <div className="flex justify-center">

          {/* Profile picture */}
          <div className="relative w-32 h-32">
            <div className="w-32 h-32 relative rounded-full overflow-hidden bg-background rounded-full shadow-[0px_4px_10px_rgba(0,0,0,0.25)]">
              <Image
                  src={profile?.avatar_url || pfp}
                  alt="User Profile Picture"
                  fill
                  className="object-cover"
                  sizes="7rem"
              />
            </div>
            <EditIcon />
          </div>
        </div>
        <div className='mt-4'>

          <Card infoData={[
              { title: "Username", description: loading ? "Loading..." : profile?.username || "No Username", editable: true },
              { title: "Email", description: loading ? "Loading..." : user?.email || "No Email", editable: true },
            ]}
            switchFunc={() => console.log("Switch toggled")}
          />

          <Card infoData={[
            { title: "Old Password", description: "", editable: true },
            { title: "New Password", description: "", editable: true},
            { title: "Confirm Password", description: "", editable: true }
          ]}
            switchFunc={() => console.log("Switch toggled")}
          />
          
        </div>
      </div>
    </Layout>
  )
}
