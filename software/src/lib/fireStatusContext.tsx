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
import { FIRE_LOCATION } from "@/lib/constants";
import { eventBus } from "@/lib/eventBus";

export type FireLocation = {
  lat: number;
  lng: number;
  name: string;
  severity: "high" | "non-fire";
  
};

interface FireStatusContextType {
  fireLocations: FireLocation[];
  isSafe: boolean;
  version: number;
}

const FireStatusContext = createContext<FireStatusContextType | undefined>(
  undefined
);

export function FireStatusProvider({ children }: { children: ReactNode }) {
  const [fireLocations, setFireLocations] = useState<FireLocation[]>([]);
  const [isSafe, setIsSafe] = useState(true);

  const lastStatusRef = useRef<string | null>(null);

  const [version, setVersion] = useState(0);

  // INITIAL LOAD
  useEffect(() => {
    async function loadInitial() {
      const { data } = await supabase
        .from("fire_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!data) return;

      const isFire = data.status === "fire";

      setIsSafe(!isFire);

      if (isFire) {
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
        (payload) => {
          const newLog = payload.new;
          const newStatus = newLog.status;

          console.log("🔥 REALTIME FIRE LOG:", newStatus);

          const isFire = newStatus === "fire";

          setIsSafe(!isFire);

          if (isFire) {
            const location: FireLocation = {
              lat: newLog.lat,
              lng: newLog.lng,
              name: "🔥 Fire Detected",
              severity: "high",
            };

            setFireLocations([location]);
          } else {
            setFireLocations([]);
          }

          setVersion((v) => v + 1);

          // EMIT EVENT FOR NOTIFICATION
          if (lastStatusRef.current !== newStatus) {
            eventBus.emit("fire:status-changed", {
              fromStatus: lastStatusRef.current,
              toStatus: newStatus,
              location: {
                lat: newLog.lat,
                lng: newLog.lng,
                name: "ECC-806",
              },
            });

            lastStatusRef.current = newStatus;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <FireStatusContext.Provider value={{ fireLocations, isSafe, version }}>
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