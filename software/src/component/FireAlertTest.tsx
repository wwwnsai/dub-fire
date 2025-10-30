"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Send, Users, Clock } from "lucide-react";
import { NotificationStats } from "@/lib/types";
import { API_ENDPOINTS } from "@/lib/constants";
import { eventBus } from "@/lib/eventBus";

export default function FireAlertTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<NotificationStats | null>(null);

  const triggerFireAlert = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(API_ENDPOINTS.FIRE_ALERT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "fire",
          location: "Dubai Fire Station",
          severity: "high",
          coordinates: {
            lat: 25.2048,
            lng: 55.2708,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Fire alert sent successfully! Check console for details.");
        fetchStats(); // Refresh stats

        // ✅ Emit an event locally
        eventBus.emit("fire:alert", {
          status: "fire",
          location: "Dubai Fire Station",
          severity: "high",
          time: new Date().toISOString(),
        });
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage("Failed to send fire alert. Please try again.");
      console.error("Error triggering fire alert:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.FIRE_ALERT);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Fetch stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-2 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-900">
          Fire Alert System
        </h2>
      </div>

      {/* Stats Display */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-blue-900">
                Active Subscribers
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {stats.activeSubscribers}
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-900">
                Total Subscribers
              </span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {stats.totalSubscribers}
            </p>
          </div>
        </div>
      )}

      {/* Test Button */}
      <button
        onClick={triggerFireAlert}
        disabled={isLoading}
        className="w-full bg-red-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
      >
        <Send className="w-5 h-5" />
        <span>{isLoading ? "Sending Alert..." : "Test Fire Alert"}</span>
      </button>

      {/* Message Display */}
      {message && (
        <div
          className={`mt-4 p-3 rounded-lg ${
            message.includes("Error") || message.includes("Failed")
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-green-50 text-green-800 border border-green-200"
          }`}
        >
          <p className="text-sm">{message}</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>
          ⚠️ This will send test notifications to all registered email
          subscribers.
        </p>
        <p>Check the browser console for detailed logs.</p>
      </div>
    </div>
  );
}
