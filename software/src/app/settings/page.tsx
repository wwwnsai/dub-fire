"use client";

import EditIcon from '@/components/icons/EditIcon';
import Layout from '@/components/Layout'
import Image from "next/image"
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Profile } from "@/lib/types/users";
import { requestNotificationPermission } from '@/lib/pushNotiService';
import pfp from '@/photo/pfp.jpg'
import Card from '@/components/cards/Card';
import ButtonCard from '@/components/cards/ButtonCard';
import LineAddFriendButton from '@/components/buttons/LineAddFriendButton';
import NotiReqSwitchButton from '@/components/buttons/NotiReqSwitchButton';

export default function page() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const isOAuthUser = user?.app_metadata?.provider && user.app_metadata.provider !== "email";
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const [editedUsername, setEditedUsername] = useState<string>("");
    const [editedPassword, setEditedPassword] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    // fetching user
    useEffect(() => {
        const fetchData = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            setUser(session.user);
            setIsLoggedIn(true);

            const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

            setProfile(data);
        }

        setLoading(false);
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (profile) {
        setEditedUsername(profile.username || "");
        }
    }, [profile]);

    const profileInfo = useMemo(() => [
        {
            title: "Username",
            description: loading ? "" : profile?.username || "No Username",
            editable: true
        },
        {
            title: "Email",
            description: loading ? "" : user?.email || "No Email",
            editable: false
        }
    ], [loading, profile, user]);

    // Handle Save Button
    async function handleSaveChanges() {
        if (!user || !profile) return;

        // Update Username
        if (editedUsername && editedUsername !== profile.username) {
            const { error } = await supabase
            .from("profiles")
            .update({ username: editedUsername })
            .eq("id", user.id);

            if (error) {
            console.error("Update username error:", error.message);
            } else {
            console.log("✅ Username updated");
            }
        }

        // Update Password
        if (!isOAuthUser) {
            const { oldPassword, newPassword, confirmPassword } = editedPassword;

            if (oldPassword || newPassword || confirmPassword) {
            if (!oldPassword || !newPassword || !confirmPassword) {
                alert("Please fill all password fields");
                return;
            }

            if (newPassword !== confirmPassword) {
                alert("Passwords do not match");
                return;
            }

            if (newPassword.length < 6) {
                alert("Password must be at least 6 characters");
                return;
            }

            const { error: reAuthError } =
                await supabase.auth.signInWithPassword({
                email: user.email!,
                password: oldPassword,
                });

            if (reAuthError) {
                alert("Old password incorrect");
                return;
            }

            const { error: updateError } =
                await supabase.auth.updateUser({
                password: newPassword,
                });

            if (updateError) {
                console.error(updateError.message);
            } else {
                console.log("✅ Password updated");
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
                    <Card infoData={profileInfo}
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
                            { title: "Push Notification", description: "", editable: false }
                        ]}
                    />

                    {/* <ButtonCard
                        title="Enable Notifications"
                        triggerFunc={requestNotificationPermission}
                        color="text-text-green"
                    /> */}



                    <LineAddFriendButton />

                    <ButtonCard title='Save' triggerFunc={() => handleSaveChanges()} color='text-text-green' />

                    <ButtonCard title="Logout" triggerFunc={() => supabase.auth.signOut()} color='text-secondary-light' />
                </>

            ) : (

                <div>
                    <LineAddFriendButton />
                    <ButtonCard title="Login" triggerFunc={() => router.push("/login")} color='text-secondary-light' />
                </div>
            )}
          
        </div>
      </div>
    </Layout>
  )
}
