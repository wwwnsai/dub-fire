"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      router.push("/login");
    }
  };

  return (
    <button 
        className={`flex justify-between w-full py-2 rounded`}
        onClick={handleLogout}
    >
        <h3 className="sen-semibold text-secondary-light">Logout</h3>
    </button>
  );
}