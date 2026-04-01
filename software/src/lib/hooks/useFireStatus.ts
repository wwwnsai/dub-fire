import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { eventBus } from "@/lib/eventBus";
import { sendFireAlert, sendSafeAlert } from "../lineNotiService";

export function useFireStatus() {
  const [isSafe, setIsSafe] = useState(true);
  const [fireId, setFireId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // fetch initial
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
        setIsSafe(data.status === "non-fire");
      }

      setLoading(false);
    }

    fetchStatus();
  }, []);

  // realtime sync
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

          setIsSafe(newStatus === "non-fire");

          // EMIT EVENT FOR NOTIFICATION
          if (newStatus !== oldStatus) {
            eventBus.emit("fire:status-changed", {
              fromStatus: oldStatus,
              toStatus: newStatus,
              location: {
                lat: 13.729418,
                lng: 100.775325,
                name: "ECC-806",
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // toggle 
  async function toggleFire() {
    if (!fireId) return;

    const newIsSafe = !isSafe;
    const newStatus = newIsSafe ? "non-fire" : "fire";

    setIsSafe(newIsSafe);

    try {
      const res = await fetch("/api/fire-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          fireId,
        }),
      });

      const data = await res.json();
      console.log("✅ API fire-status RESPONSE:", data);
    } catch (err) {
      console.error("🔥 API fire-status ERROR:", err);
    }

    // // log 
    // await supabase.from("fire_logs").insert({
    //   status: newStatus,
    //   lat: 13.729418,
    //   lng: 100.775325,
    // });

    // // update current state
    // const { error } = await supabase
    //   .from("fire_status")
    //   .update({
    //     status: newStatus,
    //     updated_at: new Date(),
    //   })
    //   .eq("id", fireId);

    // instant bell
    eventBus.emit("fire:status-changed", {
      fromStatus: isSafe ? "non-fire" : "fire",
      toStatus: newStatus,
      location: {
        lat: 13.729418,
        lng: 100.775325,
        name: "ECC-806",
      },
    });

      // if (newStatus === "fire") {
      //   await sendFireAlert();
      // } else {
      //   await sendSafeAlert();
      // }


    // if (error/api/fire-status
  }

  return { isSafe, toggleFire, loading };
}