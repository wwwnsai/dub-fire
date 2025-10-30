"use client";

import { useState } from "react";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Layout from "@/component/Layout";
import { eventBus } from "@/lib/eventBus";

export default function EmailPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setMessage("Please enter a valid email address");
        setIsSuccess(false);
        setIsLoading(false);
        return;
      }

      // Insert email into Supabase
      const { error } = await supabase.from("email_subscriptions").insert([
        {
          email: email.toLowerCase().trim(),
          created_at: new Date().toISOString(),
          is_active: true,
        },
      ]);

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          setMessage("This email is already registered for notifications");
        } else {
          setMessage("Failed to register email. Please try again.");
        }
        setIsSuccess(false);
      } else {
        setMessage("Successfully registered for fire alerts!");
        setIsSuccess(true);
        setEmail(""); // Clear the form

        eventBus.emit("email:registered", {
          email,
          time: new Date().toISOString(),
        });
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.");
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Mail className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Fire Alert Notifications
          </h1>
          <p className="text-gray-600">
            Register your email to receive instant notifications when fire is
            detected in your area.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Registering..." : "Register for Alerts"}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 p-4 rounded-lg flex items-center space-x-2 ${
              isSuccess
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {isSuccess ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm">{message}</span>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Register your email to receive fire alerts</li>
            <li>• Get instant notifications when fire is detected</li>
            <li>• Stay informed about emergency situations</li>
            <li>• Unsubscribe anytime by contacting support</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
