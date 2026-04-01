"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { eventBus } from "@/lib/eventBus";

export type FireLocation = {
  lat: number;
  lng: number;
  name: string;
  severity: "high";
};

export function useFireStatus() {
  const [isSafe, setIsSafe] = useState(true);
  const [fireId, setFireId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fireLocations, setFireLocations] = useState<FireLocation[]>([]);

  // 📌 FIXED LOCATION (you can make dynamic later)
  const LOCATION = {
    lat: 13.729418,
    lng: 100.775325,
    name: "ECC-806",
  };

  // 🔹 INITIAL LOAD
  useEffect(() => {
    async function fetchStatus() {
      const { data, error } = await supabase
        .from("fire_status")
        .select("id, status")
        .limit(1)
        .single();

      if (error) {
        console.error("❌ fetch error:", error);
      } else {
        setFireId(data.id);

        const isFire = data.status === "fire";

        setIsSafe(!isFire);

        if (isFire) {
          setFireLocations([
            {
              ...LOCATION,
              name: "🔥 Fire Detected",
              severity: "high",
            },
          ]);
        }
      }

      setLoading(false);
    }

    fetchStatus();
  }, []);

  // 🔥 REALTIME LISTENER (MAIN DRIVER)
  useEffect(() => {
    const channel = supabase
      .channel("fire-status-channel")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "fire_status",
        },
        (payload) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old.status;

          console.log("🔥 REALTIME:", newStatus);

          const isFire = newStatus === "fire";

          // ✅ update UI
          setIsSafe(!isFire);

          if (isFire) {
            setFireLocations([
              {
                ...LOCATION,
                name: "🔥 Fire Detected",
                severity: "high",
              },
            ]);
          } else {
            setFireLocations([]);
          }

          // 🔔 notification
          if (newStatus !== oldStatus) {
            eventBus.emit("fire:status-changed", {
              fromStatus: oldStatus,
              toStatus: newStatus,
              location: LOCATION,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 SUB:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 🔘 TOGGLE
  async function toggleFire() {
    if (!fireId) return;

    const newIsSafe = !isSafe;
    const newStatus = newIsSafe ? "non-fire" : "fire";

    // ⚡ instant UI update (optional but smooth)
    setIsSafe(newIsSafe);

    if (!newIsSafe) {
      setFireLocations([
        {
          ...LOCATION,
          name: "🔥 Fire Detected",
          severity: "high",
        },
      ]);
    } else {
      setFireLocations([]);
    }

    try {
      await fetch("/api/fire-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          fireId,
        }),
      });
    } catch (err) {
      console.error("🔥 API ERROR:", err);
    }
  }

  return { isSafe, toggleFire, loading, fireLocations };
}