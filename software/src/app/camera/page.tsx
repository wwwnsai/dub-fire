"use client";

import Layout from "@/components/Layout";
import Image from "next/image";
import WebCamPhoto from "../../photo/web.png";

export default function Page() {
  return (
    <Layout>
      <div className="mt-2">
        <Image
          src={WebCamPhoto}
          alt="Live camera feed"
          width={640}
          height={640}
          className="rounded-lg shadow-[0px_4px_10px_0px_rgba(0,0,0,0.25)]"
        />
      </div>
    </Layout>
  )
}
