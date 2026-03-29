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
  const currentStatus = getCurrentFireStatus();
  const [isSafe, setIsSafe] = useState(currentStatus === "safe");

  useEffect(() => {
    setIsSafe(currentStatus === "safe");
  }, [currentStatus]);

  useEffect(() => {
    const handleStatusChange = async (event: any) => {
      const { fromStatus, toStatus } = event;

      // fire started
      if (toStatus === "fire" && fromStatus !== "fire") {
        isSafe && setIsSafe(false);
        await sendFireAlert();
      }

      // fire stopped
      if (toStatus === "non-fire" && fromStatus === "fire") {
        !isSafe && setIsSafe(true);
        await sendSafeAlert();
      }
    };

    eventBus.on("fire:status-changed", handleStatusChange);

    return () => {
      eventBus.off("fire:status-changed", handleStatusChange);
    };
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

      {/* <button
        className="px-4 bg-primary-light text-white text-md sen-bold rounded-[100px] py-4 hover:bg-secondary-light transition shadow-[0px_4px_5px_0px_rgba(0,0,0,0.10)]"
        onClick={() => fireAlertTest()}
      >
        Send LINE
      </button> */}

    </Layout>
  );
}
