"use client";

import Layout from "@/components/Layout";
import Card from "@/components/cards/Card";
import StatusCard from "@/components/cards/StatusCard";
import { useFireStatus } from "@/lib/hooks/useFireStatus";
import { useEffect, useState } from "react";
import type { SensorSnapshot } from "@/lib/types";
import { eventBus } from "@/lib/eventBus";

const EMPTY_SENSOR_STATUS: SensorSnapshot = {
  temperatureC: null,
  humidity: null,
  imuPitch: null,
  imuRoll: null,
  updatedAt: null,
  source: "uninitialized",
};

export default function Home() {
  const { isSafe, toggleFire, loading } = useFireStatus();
  const [sensorStatus, setSensorStatus] = useState<SensorSnapshot>(EMPTY_SENSOR_STATUS);

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

    loadSensorStatus();
    const intervalId = window.setInterval(loadSensorStatus, 2000);

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
      <StatusCard isSafe={isSafe} />

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