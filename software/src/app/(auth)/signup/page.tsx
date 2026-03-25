"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";

import googleLogo from "../../../photo/google-logo.png";
import facebookLogo from "../../../photo/facebook-logo.png";
import appleLogo from "../../../photo/apple-logo.png";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const checkPasswordMatch = (password: string, confirmPassword: string) => {
    return password === confirmPassword;
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!checkPasswordMatch(password, confirmPassword)) {
      setError("Passwords do not match");
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else router.push("/login");
  };

  const handleOAuthSignup = async (provider: string) => {
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({ 
      provider: provider as any 
    });
    
    if (oauthError) {
      setError(oauthError.message);
    }
  };

  return (
    <div className="h-full">
      {/* Signup Header */}
      <div className="w-44 justify-center text-navy text-2xl sen-medium mb-8">
        Create <br/>Your Account
      </div>

      {/* Signup Form */}
      <div className="flex flex-col items-center justify-center">
        <form onSubmit={handleSignup} className="flex flex-col gap-4 w-full">
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
            onChange={(e) => {
              setPassword(e.target.value);
              if (!checkPasswordMatch(e.target.value, confirmPassword)) {
                setError("Passwords do not match");
              } else {
                setError(null);
              }
            }}
          />
          <input
            type="password"
            placeholder="confirm password"
            className="py-4 border-b border-text-secondary bg-background-light sen-regular"
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (!checkPasswordMatch(password, e.target.value)) {
                setError("Passwords do not match");
              } else {
                setError(null);
              }
            }}
          />
          {!error && <div className="h-4"></div>}
          {error && <p className="text-secondary-light text-sm h-4">{error}</p>}
          <button
            type="submit"
            className="mb-4 bg-primary-light text-white text-md sen-bold rounded-[100px] py-4 hover:bg-secondary-light transition shadow-[0px_4px_5px_0px_rgba(0,0,0,0.10)]"
          >
            Sign up
          </button>
        </form>
        <div className="flex flex-col items-center w-full mt-2">
          <div className="flex justify-center items-center w-full gap-4">
            <button
              className="w-full bg-white p-4 rounded-[100px] flex items-center justify-center gap-4 hover:shadow-lg transition shadow-[0px_4px_5px_0px_rgba(0,0,0,0.10)]"
              onClick={async () => handleOAuthSignup("google")}
              // disabled={loading}
            >
              <Image src={googleLogo} alt="Google Logo" width={20} height={20} />
              <span className="text-sm sen-regular text-text-secondary">Continue with Google</span>
            </button>
          </div>
          <div className="flex justify-center items-center mt-8 fixed left-0 right-0 bottom-16 z-30 mx-8">
            <p className="mt-auto text-text-secondary sen-regular text-sm">
              Already have an account?{" "}
              <span
                className="text-secondary-light sen-semibold text-sm cursor-pointer hover:underline"
                onClick={() => router.push("/login")}
              >
                Log in
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
