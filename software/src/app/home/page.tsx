"use client";

import Layout from "@/components/Layout";
import Card from "@/components/cards/Card";
import StatusCard from "@/components/cards/StatusCard";
import { useFireStatus } from "@/lib/fireStatusContext";
import { useEffect, useState } from "react";

type PiSensor = {
  temperature_c: number | null;
  humidity: number | null;
  imu_pitch: number | null;
  imu_roll: number | null;
  tof_distance_mm: number;
  updated_at: string | null;
  isArmed: boolean;
  autoTrack: boolean;
  autoShoot: boolean;
  emergencyStop: boolean;
  shotCount: number;
  fireTempMin: number;
  fps: number;
  feederOn: boolean;
};

type PiFireStatus = {
  condition: "fire" | "non-fire" | null;
  fire_confirmed: boolean;
  both_confirmed: boolean;
  max_temp_c: number | null;
};

const fmt = (v: number | null | undefined, suffix = "") =>
  typeof v === "number" ? `${v.toFixed(1)}${suffix}` : "--";

export default function Home() {
  const { isSafe } = useFireStatus();
  const [loading, setLoading] = useState(false);
  const [sensor, setSensor] = useState<Partial<PiSensor>>({});
  const [fireStatus, setFireStatus] = useState<PiFireStatus>({
    condition: null,
    fire_confirmed: false,
    both_confirmed: false,
    max_temp_c: null,
  });

  const fireDetected = !isSafe || sensor.isArmed === true || fireStatus.both_confirmed;

  async function toggleFire() {
    setLoading(true);
    try {
      await fetch("/api/fire-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isSafe ? "fire" : "non-fire" }),
      });
    } catch (err) {
      console.error("toggleFire error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const loadSensor = async () => {
      try {
        const res = await fetch("/api/ai/sensor", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSensor(data);
      } catch {}
    };

    const loadFireStatus = async () => {
      try {
        const res = await fetch("/api/ai/fire_status", { cache: "no-store" });
        if (!res.ok) return;
        const data: PiFireStatus = await res.json();
        if (!cancelled) setFireStatus(data);
      } catch {}
    };

    loadSensor();
    loadFireStatus();
    const id = window.setInterval(() => {
      loadSensor();
      loadFireStatus();
    }, 1000);

    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  const lastUpdate = sensor.updated_at
    ? new Date(sensor.updated_at).toLocaleTimeString()
    : "--";

  return (
    <Layout>
      <StatusCard isSafe={!fireDetected} />

      <Card
        infoData={[
          { title: "Device", description: "ECC-806", editable: false },
          { title: "FPS", description: String(sensor.fps ?? "--"), editable: false },
          { title: "Shot Count", description: String(sensor.shotCount ?? "--"), editable: false },
          { title: "Fire Threshold", description: fmt(sensor.fireTempMin, " °C"), editable: false },
        ]}
      />

      <Card
        infoData={[
          { title: "Temperature", description: fmt(sensor.temperature_c, " °C"), editable: false },
          { title: "Humidity", description: fmt(sensor.humidity, " %"), editable: false },
          { title: "Pitch / Roll", description: sensor.imu_pitch != null ? `${fmt(sensor.imu_pitch)}° / ${fmt(sensor.imu_roll)}°` : "--", editable: false },
          { title: "Distance", description: sensor.tof_distance_mm != null && sensor.tof_distance_mm > 0 ? `${sensor.tof_distance_mm} mm` : "--", editable: false },
          { title: "Last Update", description: lastUpdate, editable: false },
        ]}
      />

      <Card
        infoData={[
          { title: "Condition", description: fireStatus.condition ?? "--", editable: false },
          { title: "Max Temp", description: fmt(fireStatus.max_temp_c, " °C"), editable: false },
          { title: "Thermal / RGB", description: fireStatus.fire_confirmed ? "Detected" : "Clear", editable: false },
          { title: "Both Confirmed", description: fireStatus.both_confirmed ? "YES" : "No", editable: false },
        ]}
      />

      <button
        disabled={loading}
        className="px-4 bg-primary-light text-white text-md sen-bold rounded-[100px] py-4 hover:bg-secondary-light transition shadow-[0px_4px_5px_rgba(0,0,0,0.10)] disabled:opacity-50"
        onClick={toggleFire}
      >
        toggle status
      </button>
    </Layout>
  );
}
