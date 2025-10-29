"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";

import googleLogo from "../../../photo/google-logo.png";
import facebookLogo from "../../../photo/facebook-logo.png";
import appleLogo from "../../../photo/apple-logo.png";

import LayoutAuth from "../layout";

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
    else router.push("/home"); // redirect after login
  };

  const handleOAuthLogin = async (provider: string) => {
    setLoading(true);
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({ provider: provider as any });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
    else router.push("/login");
  };

  return (
    <div className="h-full">
      <p className="text-text-primary sen-medium text-lg mb-4">Login to your account</p>
      <div className="flex flex-col items-center justify-center">
        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full">
          <input
            type="email"
            placeholder="email@email.com"
            className="py-4 px-4 rounded bg-white text-md"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="password"
            className="py-4 px-4 rounded bg-white text-md"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            className="bg-primary-light text-white text-md sen-bold rounded py-4 hover:bg-secondary-light transition"
          >
            Log In
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
        <div className="flex flex-col items-center fixed left-0 right-0 bottom-16 z-30 mx-8">
          <p className="text-text-secondary sen-regular text-sm">
            - or log in with -
          </p>
          <div className="flex justify-center items-center w-full mt-4 mb-12 gap-4">
            <button
              className="w-full bg-white p-4 rounded-xl flex items-center justify-center gap-4 hover:shadow-lg transition"
              onClick={async () => handleOAuthLogin("google")}
            >
              <Image src={googleLogo} alt="Google Logo" width={20} height={20} />
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
          <div className="flex items-end mt-8">
            <p className="mt-auto text-text-secondary sen-regular text-sm">
              Don't have an account?{" "}
              <span
                className="text-secondary-light sen-semibold text-sm cursor-pointer hover:underline"
                onClick={() => router.push("/signup")}
              >
                Sign up
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
