/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";

import googleLogo from "../../../photo/google-logo.png";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    else router.push("/home");
  };

  const handleOAuthLogin = async (provider: string) => {
    setLoading(true);
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row items-center justify-center">
      <div className="w-full h-full flex flex-col md:flex-row items-center justify-center">
        {/* Login Header */}
        <div className="w-full justify-center text-navy text-2xl sen-medium mb-8
          md:w-1/2 md:flex md:text-5xl md:items-center md:justify-start
        ">
          Log into <br/>your account
        </div>

        {/* Login Form */}
        <div className="w-full flex flex-col items-center justify-center
          md:w-1/2 md:h-full
        ">
          <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full lg:gap-6">
            <input
              type="email"
              placeholder="email@email.com"
              className="py-4 border-b border-text-secondary bg-background-light sen-regular"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="password"
              className="py-4 border-b border-text-secondary bg-background-light sen-regular"
              onChange={(e) => setPassword(e.target.value)}
            />
            {!error && <div className="h-4"></div>} 
            {error && <p className="text-red-500 text-sm h-4">{error}</p>}
            <button
              type="submit"
              className="lg:mb-6 mb-4 bg-primary-light text-white text-md sen-bold rounded-[100px] py-4 hover:bg-secondary-light transition shadow-[0px_4px_5px_0px_rgba(0,0,0,0.10)]"
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>
          <div className="flex flex-col items-center w-full mt-2">
            <div className="flex justify-center items-center w-full gap-4">
              <button
                className="w-full bg-white p-4 rounded-[100px] flex items-center justify-center gap-4 hover:shadow-lg transition shadow-[0px_4px_5px_0px_rgba(0,0,0,0.10)]"
                onClick={async () => handleOAuthLogin("google")}
                disabled={loading}
              >
                <Image src={googleLogo} alt="Google Logo" width={20} height={20} />
                <span className="text-sm sen-regular text-text-secondary">Continue with Google</span>
              </button>
              {/* <button
                className="w-1/3 bg-white p-4 rounded-xl flex items-center justify-center gap-4 hover:shadow-lg transition"
                onClick={async () => handleOAuthLogin("facebook")}
              >
                <Image src={facebookLogo} alt="Facebook Logo" width={20} height={20} />
              </button>
              <button
                className="w-1/3 bg-white p-4 rounded-xl flex items-center justify-center gap-4 hover:shadow-lg transition"
                onClick={async () => handleOAuthLogin("apple")}
              >
                <Image src={appleLogo} alt="Apple Logo" width={20} height={20} />
              </button> */}
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center items-center mt-8 fixed left-0 right-0 bottom-16 z-30 mx-8">
        <p className="mt-auto text-text-secondary sen-regular text-sm">
          Don&apos;t have an account?{" "}
          <span
            className="text-secondary-light sen-semibold text-sm cursor-pointer hover:underline"
            onClick={() => router.push("/signup")}
          >
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
}
