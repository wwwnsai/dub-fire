"use client";

import Layout from "@/components/Layout";
import Card from "@/components/cards/Card";
import StatusCard from "@/components/cards/StatusCard";
import { useFireStatus } from "@/lib/fireStatusContext";
import { useEffect, useState } from "react";
import type { SensorSnapshot } from "@/lib/types";

type PiFireStatus = {
  condition: "fire" | "non-fire" | null;
  fire_confirmed: boolean;
  both_confirmed: boolean;
  max_temp_c: number | null;
};

const EMPTY_SENSOR_STATUS: SensorSnapshot = {
  temperatureC: null,
  humidity: null,
  imuPitch: null,
  imuRoll: null,
  updatedAt: null,
  source: "uninitialized",
};

export default function Home() {
  const { isSafe } = useFireStatus();
  const [loading, setLoading] = useState(false);
  const [sensorStatus, setSensorStatus] = useState<SensorSnapshot>(EMPTY_SENSOR_STATUS);
  const [piIsArmed, setPiIsArmed] = useState<boolean | null>(null);
  const [piFireStatus, setPiFireStatus] = useState<PiFireStatus>({ condition: null, fire_confirmed: false, both_confirmed: false, max_temp_c: null });

  // Combined fire status: fire if Supabase OR Pi sensor says so
  const fireDetected = !isSafe || piIsArmed === true;

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

    const loadSensorStatus = async () => {
      try {
        const response = await fetch("/api/sensor-status", { cache: "no-store" });
        if (!response.ok) return;

        const data: SensorSnapshot = await response.json();
        if (!cancelled) {
          setSensorStatus(data);
        }
      } catch (error) {
        console.error("Failed to load sensor status", error);
      }
    };

    const loadPiStatus = async () => {
      try {
        const response = await fetch("/api/ai/sensor", { cache: "no-store" });
        if (!response.ok) return;

        const data = await response.json();
        if (!cancelled && typeof data.isArmed === "boolean") {
          setPiIsArmed(data.isArmed);
        }
      } catch {
        // Pi offline — keep last known value, fall back to Supabase isSafe
      }
    };

    const loadFireStatus = async () => {
      try {
        const response = await fetch("/api/ai/fire_status", { cache: "no-store" });
        if (!response.ok) return;
        const data: PiFireStatus = await response.json();
        if (!cancelled) setPiFireStatus(data);
      } catch {
        // Pi offline — leave last known state
      }
    };

    loadSensorStatus();
    loadPiStatus();
    loadFireStatus();
    const intervalId = window.setInterval(() => {
      loadSensorStatus();
      loadPiStatus();
      loadFireStatus();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const formattedTemp =
    sensorStatus.temperatureC !== null ? `${sensorStatus.temperatureC.toFixed(1)} °C` : "--";
  const formattedHumidity =
    sensorStatus.humidity !== null ? `${sensorStatus.humidity.toFixed(1)} %` : "--";
  const formattedLastCheck = sensorStatus.updatedAt
    ? new Date(sensorStatus.updatedAt).toLocaleTimeString()
    : "--";
  const sensorHealth =
    sensorStatus.updatedAt &&
    Date.now() - new Date(sensorStatus.updatedAt).getTime() < 10000
      ? "Live"
      : "Waiting";

  return (
    <Layout>
      <StatusCard isSafe={!fireDetected} />

      <Card
        infoData={[
          { title: "Device", description: "ECC-806", editable: false },
        ]}
      />

      <Card
        infoData={[
          { title: "Temperature", description: formattedTemp, editable: false },
          { title: "Humidity", description: formattedHumidity, editable: false },
          { title: "Last Update", description: formattedLastCheck, editable: false },
          { title: "Sensor Health", description: sensorHealth, editable: false },
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