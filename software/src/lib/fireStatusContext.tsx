"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import {FIRE_LOCATION }from "@/lib/constants";

export type FireLocation = {
  lat: number;
  lng: number;
  name: string;
  severity: "high" | "non-fire";
};

interface FireStatusContextType {
  fireLocations: FireLocation[];
  isSafe: boolean;
}

const FireStatusContext = createContext<FireStatusContextType | undefined>(
  undefined
);

export function FireStatusProvider({ children }: { children: ReactNode }) {
  const [fireLocations, setFireLocations] = useState<FireLocation[]>([]);
  const [isSafe, setIsSafe] = useState(true);

  const lastStatusRef = useRef<string | null>(null);

  // INITIAL 
  useEffect(() => {
    async function loadInitial() {
      const { data } = await supabase
        .from("fire_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!data) return;

      setIsSafe(data.status === "non-fire");

      if (data.status === "fire") {
        setFireLocations([
          {
            lat: FIRE_LOCATION.lat,
            lng: FIRE_LOCATION.lng,
            name: "🔥 Fire Detected",
            severity: "high",
          },
        ]);
      } else {
        setFireLocations([]);
      }
  
      lastStatusRef.current = data.status;
    }

    loadInitial();
  }, []);

  // REALTIME LISTENER
  useEffect(() => {
    const channel = supabase
      .channel("fire-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fire_logs",
        },
        async (payload) => {
          const newLog = payload.new;

          console.log("🔥 REALTIME FIRE LOG:", newLog);

          setIsSafe(newLog.status === "non-fire");

          setFireLocations((prev) => {
            if (newLog.status === "fire") {
              return [
                {
                  lat: newLog.lat,
                  lng: newLog.lng,
                  name: "🔥 Fire Detected",
                  severity: "high",
                },
              ];
            }
            return [
              { 
                lat: newLog.lat, 
                lng: newLog.lng, 
                name: "🧯 Fire Cleared", 
                severity: "non-fire" 
              },
            ];
          });

          // PREVENT DUPLICATE NOTI
          if (lastStatusRef.current !== newLog.status) {
            lastStatusRef.current = newLog.status;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <FireStatusContext.Provider value={{ fireLocations, isSafe }}>
      {children}
    </FireStatusContext.Provider>
  );
}

export function useFireStatus() {
  const context = useContext(FireStatusContext);
  if (!context) {
    throw new Error("useFireStatus must be used inside provider");
  }
  return context;
}