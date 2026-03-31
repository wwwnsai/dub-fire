"use client";

import Layout from "@/components/Layout";
import Card from "@/components/cards/Card";
import StatusCard from "@/components/cards/StatusCard";
import { useFireStatus } from "@/lib/hooks/useFireStatus";

export default function Home() {
  const { isSafe, toggleFire, loading } = useFireStatus();

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
          { title: "Temperature", description: "25°C", editable: false },
          { title: "Sensor Health", description: "Normal", editable: false },
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