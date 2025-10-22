"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else router.push("/login"); // redirect after signup
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <form onSubmit={handleSignup} className="flex flex-col gap-3 w-72">
        <input
          type="email"
          placeholder="Email"
          className="border p-2 rounded"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="border p-2 rounded"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="bg-green-500 text-white rounded py-2 hover:bg-green-600 transition"
        >
          Sign Up
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </form>
    </div>
  );
}
