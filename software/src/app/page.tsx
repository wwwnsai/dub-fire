import Image from "next/image";
import Layout from "@/component/Layout";
import StatusCard from "@/component/StatusCard";
import SensorStatus from "@/component/SensorStatus";
import WebCamPhoto from "../photo/web.png";

export default function Home() {
  return (
    <Layout>
      <div className="flex justify-between items-center mb-2">
        <h1 className="sen-regular text-xl" style={{ color: "#5a5a5a" }}>Current Status</h1>
      </div>
      <StatusCard device="ECC-806" status="safe" />

      <h1 className="sen-regular text-xl pt-2" style={{ color: "#5a5a5a" }}>Sensor Status</h1>
      <SensorStatus
        lastCheck="19:00"
        humidity="Normal"
        temperature1={25}
        temperature2={25}
      />

      <h1 className="sen-regular text-xl py-2" style={{ color: "#5a5a5a" }}>Live Camera</h1>
      {/* <LiveCamera src={WebCamPhoto.src} /> */}
      <Image src={WebCamPhoto} alt="status icon" width={640} height={640} 
      className="rounded-lg shadow"
/>

    </Layout>
  );
}
