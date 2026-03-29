"use client";

import Layout from "@/components/Layout";
import LiveCamera from "@/components/LiveCamera";

const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_BASE_URL || "http://127.0.0.1:5001";

export default function Page() {
  return (
    <Layout>
      <div className="mt-2 grid gap-6">
        <div>
          <p className="mb-2 text-sm sen-semibold text-text-secondary">RGB Detection Feed</p>
          <LiveCamera src={`${AI_BASE_URL}/rgb_feed`} />
        </div>
        <div>
          <p className="mb-2 text-sm sen-semibold text-text-secondary">Thermal Detection Feed</p>
          <LiveCamera src={`${AI_BASE_URL}/thermal_feed`} />
        </div>
      </div>
    </Layout>
  )
}
