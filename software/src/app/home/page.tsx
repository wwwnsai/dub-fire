"use client";

import Image from "next/image";
import Layout from "@/components/Layout";
import { useFireStatus } from "@/lib/fireStatusContext";
import Card from "@/components/cards/Card";
import StatusCard from "@/components/cards/StatusCard";
import { useEffect, useState } from "react";
import { sendFireAlert, sendSafeAlert } from "@/lib/lineNotiService";
import { eventBus } from "@/lib/eventBus";

export default function Home() {
  const { getCurrentFireStatus } = useFireStatus();
  const [isSafe, setIsSafe] = useState(true);

  function handleToggleStatus() {
    const prev = isSafe;
    const newIsSafe = !prev;

    setIsSafe(newIsSafe);

    const fromStatus = prev ? "non-fire" : "fire";
    const toStatus = newIsSafe ? "non-fire" : "fire";

    console.log("🔥 emitting event:", { fromStatus, toStatus });

    eventBus.emit("fire:status-changed", {
      locationId: "manual-test",
      fromStatus,
      toStatus,
      location: {
        lat: 0,
        lng: 0,
        name: "Manual Toggle",
        severity: toStatus,
      },
    });
  }

  useEffect(() => {
    const status = getCurrentFireStatus();
    setIsSafe(status === "safe");
  }, []);

  useEffect(() => {
    const handleStatusChange = async (event: any) => {
      const { fromStatus, toStatus } = event;

      // fire started
      if (toStatus === "fire" && fromStatus !== "fire") {
        isSafe && setIsSafe(false);
        // await sendFireAlert();
      }

      // fire stopped
      if (toStatus === "non-fire" && fromStatus === "fire") {
        !isSafe && setIsSafe(true);
        // await sendSafeAlert();
      }
    };

    eventBus.on("fire:status-changed", handleStatusChange);

    return () => {
      eventBus.off("fire:status-changed", handleStatusChange);
    };
  }, []);

  // pwa push noti
  useEffect(() => {
    const handler = async ({ fromStatus, toStatus }: any) => {
      console.log("🚨 EVENT RECEIVED:", { fromStatus, toStatus });

      // 🔥 FIRE
      if (toStatus === "fire") {
        console.log("🔥 sending FIRE push");

        // fallback (when tab is active)
        // if (Notification.permission === "granted") {
        //   new Notification("🔥 Fire Alert", {
        //     body: "Fire detected!",
        //   });
        // }

        await fetch("/api/push-noti", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "🔥 Fire Alert",
            body: "Fire detected!",
          }),
        });
      }

      // 🧯 SAFE
      if (fromStatus === "fire" && toStatus === "non-fire") {
        console.log("🧯 sending SAFE push");

        // if (Notification.permission === "granted") {
        //   new Notification("🧯 Safe", {
        //     body: "Fire has been extinguished",
        //   });
        // }

        await fetch("/api/push-noti", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "🧯 Safe",
            body: "Fire has been extinguished",
          }),
        });
      }
    };

    eventBus.on("fire:status-changed", handler);
    return () => eventBus.off("fire:status-changed", handler);
  }, []);

  return (
    <Layout>
      <div className="">
        <StatusCard isSafe={isSafe} />
      </div>
    
      <Card infoData={[
          { title: "Device", description: "ECC-806", editable: false }
        ]}
        switchFunc={() => console.log("Switch toggled")}
      />

      <Card infoData={[
          { title: "Temperature", description: "25°C", editable: false },
          // { title: "Humidity", description: "Normal", editable: false },
          { title: "Sensor Health", description: "Normal", editable: false },
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
