"use client";

import Layout from "@/component/Layout";
import Image from "next/image";
import WebCamPhoto from "../../photo/web.png";

export default function Page() {
  return (
    <Layout>
      <div className="mt-2">
        <div className="mb-2">
          <h1 className="sen-regular text-xl text-text-secondary">
            Live Camera
          </h1>
        </div>
        <Image
          src={WebCamPhoto}
          alt="Live camera feed"
          width={640}
          height={640}
          className="rounded-lg shadow"
        />
      </div>
    </Layout>
  )
}
