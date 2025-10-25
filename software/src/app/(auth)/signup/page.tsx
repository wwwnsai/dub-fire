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

    const { data } = await supabase.auth.signInWithPassword({ email, password });
    if (data.user) {
      setError("An account with this email already exists");
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else router.push("/login");
  };

  const handleOAuthSignup = async (provider: string) => {
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({ provider: provider as any });
    if (oauthError) setError(oauthError.message);
    else router.push("/signup");
  };

  return (
    <div className="h-full">
      <p className="text-text-primary sen-medium text-lg mb-4">Create your account</p>
      <div className="flex flex-col items-center justify-center">
        <form onSubmit={handleSignup} className="flex flex-col gap-4 w-full">
          <input
            type="email"
            placeholder="email@email.com"
            className="py-4 px-4 rounded-xl bg-white text-md"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="password"
            className="py-4 px-4 rounded-xl bg-white text-md"
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
            className="py-4 px-4 rounded-xl bg-white text-md"
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (!checkPasswordMatch(password, e.target.value)) {
                setError("Passwords do not match");
              } else {
                setError(null);
              }
            }}
          />
          <button
            type="submit"
            className="bg-primary-light text-white text-md sen-bold rounded-xl py-4 hover:bg-secondary-light transition"
          >
            Sign up
          </button>
          {!error && <div className="h-5"></div>}
          {error && <p className="text-secondary-light text-sm">{error}</p>}
        </form>
        <div className="flex flex-col items-center fixed left-0 right-0 bottom-16 z-30 mx-8">
          <p className="text-text-secondary sen-regular text-sm">
            - or sign up with -
          </p>
          <div className="flex justify-center items-center w-full mt-4 mb-8 gap-4">
            <button
              className="w-1/3 bg-white p-4 rounded-xl flex items-center justify-center gap-4 hover:shadow-lg transition"
              onClick={async () => handleOAuthSignup("google")}
            >
              <Image src={googleLogo} alt="Google Logo" width={20} height={20} />
            </button>
            <button
              className="w-1/3 bg-white p-4 rounded-xl flex items-center justify-center gap-4 hover:shadow-lg transition"
              onClick={async () => handleOAuthSignup("facebook")}
            >
              <Image src={facebookLogo} alt="Facebook Logo" width={20} height={20} />
            </button>
            <button
              className="w-1/3 bg-white p-4 rounded-xl flex items-center justify-center gap-4 hover:shadow-lg transition"
              onClick={async () => handleOAuthSignup("apple")}
            >
              <Image src={appleLogo} alt="Apple Logo" width={20} height={20} />
            </button>
          </div>
          <div className="flex items-end mt-8">
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
