"use client";

import Layout from "@/components/Layout";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/hooks/useProfile";

import EditIcon from "@/components/icons/EditIcon";
import Card from "@/components/cards/Card";
import ButtonCard from "@/components/cards/ButtonCard";
import LineAddFriendButton from "@/components/buttons/LineAddFriendButton";
import pfp from "@/photo/pfp.png";
import { uploadAvatar } from "@/lib/avatar";

export default function Page() {
  const router = useRouter();
  const { user, profile, loading } = useProfile();

  const isLoggedIn = !!user;
  const isOAuthUser =
    user?.app_metadata?.provider &&
    user.app_metadata.provider !== "email";

  const [editedUsername, setEditedUsername] = useState("");
  const [password, setPassword] = useState({
    old: "",
    new: "",
    confirm: "",
  });
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileInfo = useMemo(() => [
    {
      title: "Username",
      description: loading ? "" : profile?.username || "No Username",
      editable: true,
    },
    {
      title: "Email",
      description: loading ? "" : user?.email || "No Email",
      editable: false,
    },
  ], [loading, profile, user]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedAvatar(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!user) return;

    // avatar
    if (selectedAvatar) {
      try {
        const url = await uploadAvatar(user.id, selectedAvatar);
        console.log("Avatar updated:", url);
      } catch (err) {
        console.error(err);
        return alert("Avatar upload failed");
      }
    }

    // username
    if (editedUsername && editedUsername !== profile?.username) {
      await supabase
        .from("profiles")
        .update({ username: editedUsername })
        .eq("id", user.id);
    }

    // password
    if (!isOAuthUser) {
      const { old, new: newPass, confirm } = password;

      if (old || newPass || confirm) {
        if (!old || !newPass || !confirm) return alert("Fill all fields");
        if (newPass !== confirm) return alert("Passwords mismatch");
        if (newPass.length < 6) return alert("Min 6 chars");

        const { error: reAuthError } =
          await supabase.auth.signInWithPassword({
            email: user.email!,
            password: old,
          });

        if (reAuthError) return alert("Wrong old password");

        await supabase.auth.updateUser({ password: newPass });

        setPassword({ old: "", new: "", confirm: "" });
      }
    }

    console.log("Profile Saved");
  }

  return (
    <Layout>
      {isLoggedIn ? (
        <>
          {/* Profile */}
          <div className="flex justify-center mt-2">
            <div className="relative w-32 h-32">
              <div className="w-32 h-32 relative rounded-full overflow-hidden bg-background rounded-full shadow-[0px_4px_10px_rgba(0,0,0,0.25)]">
                <Image
                  src={preview || profile?.avatar_url || pfp}
                  alt="pfp"
                  fill
                  className="object-cover"
                />
              </div>
              <EditIcon onClick={() => fileInputRef.current?.click()} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
            </div>
          </div>

          {/* Username + Email */}
          <Card
            infoData={profileInfo}
            onChangeText={(v) => setEditedUsername(v[0])}
          />

          {/* Password */}
          {!isOAuthUser && (
            <Card
              infoData={[
                { title: "Old Password", description: "", editable: true },
                { title: "New Password", description: "", editable: true },
                { title: "Confirm Password", description: "", editable: true },
              ]}
              onChangeText={(v) =>
                setPassword({
                  old: v[0],
                  new: v[1],
                  confirm: v[2],
                })
              }
            />
          )}

          {/* Notification toggle */}
          <Card
            infoData={[
              {
                title: "Enable Notification",
                description: "",
                editable: false,
              },
            ]}
          />

          <LineAddFriendButton />

          <ButtonCard
            title="Save"
            triggerFunc={handleSave}
            color="text-text-green"
          />

          <ButtonCard
            title="Logout"
            triggerFunc={() => supabase.auth.signOut()}
            color="text-secondary-light"
          />
        </>
      ) : (
        <>
          <LineAddFriendButton />
          <ButtonCard
            title="Login"
            triggerFunc={() => router.push("/login")}
            color="text-secondary-light"
          />
        </>
      )}
    </Layout>
  );
}