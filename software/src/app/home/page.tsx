"use client";

import Image from "next/image";
import Layout from "@/component/Layout";
import StatusCard from "@/component/StatusCard";
import SensorStatus from "@/component/SensorStatus";
import FireAlertTest from "@/component/FireAlertTest";
import WebCamPhoto from "../../photo/web.png";
import { useFireStatus } from "@/lib/fireStatusContext";

export default function Home() {
  const { getCurrentFireStatus } = useFireStatus();
  const currentStatus = getCurrentFireStatus();

  return (
    <Layout>
      <div className="mt-2">
        <div className="mb-2">
          <h1 className="sen-regular text-xl" style={{ color: "#5a5a5a" }}>
            Current Status
          </h1>
        </div>
        <StatusCard device="ECC-806" status={currentStatus} />
      </div>

      <div className="mt-4">
        <div className="mb-2">
          <h1 className="sen-regular text-xl pt-2" style={{ color: "#5a5a5a" }}>
            Sensor Status
          </h1>
        </div>
        <SensorStatus
          lastCheck="19:00"
          humidity="Normal"
          temperature1={25}
          temperature2={25}
        />
      </div>

      <div className="mt-4">
        <div className="mb-2">
          <h1 className="sen-regular text-xl py-2" style={{ color: "#5a5a5a" }}>
            Live Camera
          </h1>
        </div>
        {/* <LiveCamera src={WebCamPhoto.src} /> */}
        <Image
          src={WebCamPhoto}
          alt="status icon"
          width={640}
          height={640}
          className="rounded-lg shadow"
        />
      </div>

      <div className="mt-4">
        <div className="mb-2">
          <h1 className="sen-regular text-xl py-4" style={{ color: "#5a5a5a" }}>
            Fire Alert System
          </h1>
        </div>
        <FireAlertTest />
      </div>
    </Layout>
  );
}
