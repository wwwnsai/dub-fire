import { supabase } from "@/lib/supabaseClient";

export async function uploadAvatar(userId: string, file: File) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  // Upload
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
    });

  console.log("Upload result avatars:", { filePath, uploadError });

  if (uploadError) {
    throw uploadError;
  }

  // Get public URL
  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

  const publicUrl = data.publicUrl;

  // Update DB
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);

  console.log("DB update result:", { publicUrl, updateError });

  if (updateError) {
    throw updateError;
  }

  return publicUrl;
}
