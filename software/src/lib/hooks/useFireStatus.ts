import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
        setLoading(false);
        return;
      }

      setFireId(data.id);
      setIsSafe(data.status === "non-fire");
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
          console.log("🔥 REALTIME:", newStatus);

          setIsSafe(newStatus === "non-fire");
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

    // log 
    await supabase.from("fire_logs").insert({
      status: newStatus,
      lat: 13.729418,
      lng: 100.775325,
    });

    // update current state
    const { error } = await supabase
      .from("fire_status")
      .update({
        status: newStatus,
        updated_at: new Date(),
      })
      .eq("id", fireId);

    if (error) {
      console.error("❌ update error:", error);
    }
  }

  return { isSafe, toggleFire, loading };
}