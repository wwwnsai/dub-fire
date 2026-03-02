"use client";

import Image from "next/image";
import Layout from "@/components/Layout";
// import StatusCard from "@/components/StatusCard";
import SensorStatus from "@/components/SensorStatus";
import FireAlertTest from "@/components/FireAlertTest";
import WebCamPhoto from "../../photo/web.png";
import { useFireStatus } from "@/lib/fireStatusContext";
import Card from "@/components/cards/Card";
import StatusCard from "@/components/cards/StatusCard";

export default function Home() {
  const { getCurrentFireStatus } = useFireStatus();
  const currentStatus = getCurrentFireStatus();

  return (
    <Layout>
      <div className="">
        {/* <div className="mb-2">
          <h1 className="sen-regular text-xl text-text-secondary">
            Current Status
          </h1>
        </div>
        <StatusCard device="ECC-806" status={currentStatus} /> */}
      <StatusCard isSafe={true} />
      </div>

      {/* <div className="">
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
      </div> */}
    
      <Card infoData={[
          { title: "Device", description: "ECC-806", editable: false }
        ]}
        switchFunc={() => console.log("Switch toggled")}
      />

      <Card infoData={[
          { title: "Temperature", description: "25°C", editable: false },
          { title: "Humidity", description: "Normal", editable: false },
          { title: "Sensor Health", description: "Normal", editable: false },
        ]}
        switchFunc={() => console.log("Switch toggled")}
      />


    </Layout>
  );
}
