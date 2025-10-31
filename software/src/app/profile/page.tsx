"use client"

import Layout from "@/component/Layout"
import Image from "next/image"
import BackButton from "@/component/buttons/BackButton";
import pfp from '@/photo/pfp.jpg'
import InfoCards from "@/component/cards/InfoCards";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Profile } from "@/lib/types/users";


export default function Page() {
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
                .from("email_subscriptions")
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
                <InfoCards infoData={info} switchFunc={handleSwitchToggle} />
            </div>
        </main>
    )
}