"use client";

import Layout from "@/components/Layout";
import { useFireStatus } from "@/lib/fireStatusContext";
import Card from "@/components/cards/Card";
import StatusCard from "@/components/cards/StatusCard";
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
  const { getCurrentFireStatus } = useFireStatus();
  const currentStatus = getCurrentFireStatus();
  const [isSafe, setIsSafe] = useState(currentStatus === "safe");
  const [sensorStatus, setSensorStatus] = useState<SensorSnapshot>(EMPTY_SENSOR_STATUS);

  function handleToggleStatus() {
    setIsSafe((prev) => !prev);

    const fromStatus = isSafe ? "non-fire" : "fire";
    const toStatus = isSafe ? "fire" : "non-fire";

    console.log("Emitting event:", { fromStatus, toStatus });

    eventBus.emit("fire:status-changed", {
      locationId: "manual-test",
      fromStatus,
      toStatus,
      location: {
        lat: 0,
        lng: 0,
        name: "Manual Toggle",
        severity: toStatus === "fire" ? "fire" : "non-fire",
      },
    });
  }

  useEffect(() => {
    setIsSafe(currentStatus === "safe");
  }, [currentStatus]);

  useEffect(() => {
    const handleStatusChange = async (event: any) => {
      const { fromStatus, toStatus } = event;

      if (toStatus === "fire" && fromStatus !== "fire") {
        isSafe && setIsSafe(false);
      }

      if (toStatus === "non-fire" && fromStatus === "fire") {
        !isSafe && setIsSafe(true);
      }
    };

    eventBus.on("fire:status-changed", handleStatusChange);

    return () => {
      eventBus.off("fire:status-changed", handleStatusChange);
    };
  }, [isSafe]);

  useEffect(() => {
    const handler = async ({ fromStatus, toStatus }: any) => {
      if (toStatus === "fire") {
        await fetch("/api/push-noti", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "Fire Alert",
            body: "Fire detected!",
          }),
        });
      }

      if (fromStatus === "fire" && toStatus === "non-fire") {
        await fetch("/api/push-noti", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "Safe",
            body: "Fire has been extinguished",
          }),
        });
      }
    };

    eventBus.on("fire:status-changed", handler);

    return () => eventBus.off("fire:status-changed", handler);
  }, []);

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
      <div>
        <StatusCard isSafe={isSafe} />
      </div>

      <Card
        infoData={[{ title: "Device", description: "ECC-806", editable: false }]}
        switchFunc={() => console.log("Switch toggled")}
      />

      <Card
        infoData={[
          { title: "Temperature", description: formattedTemp, editable: false },
          { title: "Humidity", description: formattedHumidity, editable: false },
          { title: "Last Update", description: formattedLastCheck, editable: false },
          { title: "Sensor Health", description: sensorHealth, editable: false },
        ]}
        switchFunc={() => console.log("Switch toggled")}
      />

      <button
        className="px-4 bg-primary-light text-white text-md sen-bold rounded-[100px] py-4 hover:bg-secondary-light transition shadow-[0px_4px_5px_0px_rgba(0,0,0,0.10)]"
        onClick={handleToggleStatus}
      >
        toggle status
      </button>
    </Layout>
  );
}
