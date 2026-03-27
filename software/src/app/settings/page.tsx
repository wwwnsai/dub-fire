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
import ButtonCard from '@/components/cards/ButtonCard';

export default function page() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const isOAuthUser = user?.app_metadata?.provider && user.app_metadata.provider !== "email";
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const [toggleNotifications, setToggleNotifications] = useState(false);

    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const [editedUsername, setEditedUsername] = useState<String>("");
    const [editedPassword, setEditedPassword] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

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
                setIsLoggedIn(true);

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
                setIsLoggedIn(false);
                // router.push("/login");
            }
        };

        fetchDataAndSubscribe();

        // Auth listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === "SIGNED_OUT") {
                    setProfile(null);
                    setUser(null);
                    setIsLoggedIn(false);
                    if (profileChannel) {
                        supabase.removeChannel(profileChannel);
                    }
                }

                if (event === "SIGNED_IN" && session) {
                    setUser(session.user);
                    setIsLoggedIn(true);
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
            setToggleNotifications(profile.email_noti);
        }
    }, [profile]);


    // Handle Noti Toggle
    async function handleSwitchToggle() {
        if (!user) return; 

        const newStatus = !toggleNotifications;

        setToggleNotifications(newStatus);

        // DATABASE UPDATE
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
            setToggleNotifications(!newStatus); 
        }

        if (subscriptionUpdate.error) {
            console.error("Error updating subscription:", subscriptionUpdate.error.message);
            setToggleNotifications(!newStatus); 
        }
    }

    // Handle Save Button
    async function handleSaveChanges() {
        if (!user || !profile) return;

        console.log("editedUsername:", editedUsername);
        console.log("username changed?", editedUsername !== profile.username);
        // Update Username
        if (
            editedUsername &&
            editedUsername !== profile.username
        ) {
            const { error } = await supabase
                .from("profiles")
                .update({ username: editedUsername })
                .eq("id", user.id);

            if (error) {
                console.error("✅ Update username error:", error.message);
            } else {
                console.log("✅ Username updated");
            }
        }

        // Update Password (only for email users)
        if (!isOAuthUser) {
            const { oldPassword, newPassword, confirmPassword } = editedPassword;

            // Only run if user typed something
            if (oldPassword || newPassword || confirmPassword) {

                // Validation
                if (!oldPassword || !newPassword || !confirmPassword) {
                    alert("Please fill all password fields");
                    return;
                }

                if (newPassword !== confirmPassword) {
                    alert("New password and confirm password do not match");
                    return;
                }

                if (newPassword.length < 6) {
                    alert("Password must be at least 6 characters");
                    return;
                }

                // Re-authenticate (IMPORTANT)
                const { error: reAuthError } =
                    await supabase.auth.signInWithPassword({
                        email: user.email!,
                        password: oldPassword,
                    });

                if (reAuthError) {
                    alert("Old password is incorrect");
                    return;
                }

                // Update password
                const { error: updateError } =
                    await supabase.auth.updateUser({
                        password: newPassword,
                    });

                if (updateError) {
                    console.error("Password update error:", updateError.message);
                } else {
                    console.log("Password updated");

                    // Reset fields after success
                    setEditedPassword({
                        oldPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                    });
                }
            }
        }

        console.log("✅ Save complete");
    }

    useEffect(() => {
        if (profile && user) {
            setEditedUsername(profile.username || "");
        }
    }, [profile, user]);

  return (
    <Layout>
      <div className="mt-2">
        {/* Profile picture */}
        {isLoggedIn &&
            <div className="flex justify-center">
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
        }
        <div className={`${isLoggedIn ? 'mt-4 mb-12' : ''}`}>
            {isLoggedIn ? (
                <>
                    <Card infoData={[
                            { title: "Username", description: loading ? "Loading..." : profile?.username || "No Username", editable: true },
                            { title: "Email", description: loading ? "Loading..." : user?.email || "No Email", editable: false },
                        ]}
                        onChangeText={(values) => {
                            setEditedUsername(values[0]);
                        }}
                    />

                    {!isOAuthUser && (
                        <Card infoData={[
                            { title: "Old Password", description: "", editable: true },
                            { title: "New Password", description: "", editable: true },
                            { title: "Confirm Password", description: "", editable: true }
                            ]} 
                            onChangeText={(values) => {
                                setEditedPassword({
                                    oldPassword: values[0],
                                    newPassword: values[1],
                                    confirmPassword: values[2]
                                });
                            }}
                        />
                    )}

                    <Card infoData={[
                            { title: "Email Notification", description: toggleNotifications ? "On" : "Off", editable: false }
                        ]}
                        switchFunc={handleSwitchToggle}
                    />

                    <ButtonCard title='Save' triggerFunc={() => handleSaveChanges()} color='text-text-green' />

                    <ButtonCard title="Logout" triggerFunc={() => supabase.auth.signOut()} color='text-secondary-light' />
                </>

            ) : (

                <ButtonCard title="Login" triggerFunc={() => router.push("/login")} color='text-secondary-light' />
            )}
          
        </div>
      </div>
    </Layout>
  )
}
