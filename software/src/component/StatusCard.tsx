// components/StatusCard.tsx
import { FC } from "react";
import Image from "next/image";
import fire from "../photo/fire.png";
interface StatusCardProps {
  device: string;
  status: "safe" | "alert";
}

const StatusCard: FC<StatusCardProps> = ({ device, status }) => {
  return (
    <div className="bg-white shadow-md rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-gray-600 text-sm">Device: <span className="font-semibold">{device}</span></p>
        <p className={`text-lg font-bold ${status === "safe" ? "text-green-600" : "text-red-600"}`}>
          {status}
        </p>
      </div>
      <Image src={fire} alt="status icon" width={64} height={64} />
    </div>
  );
};

export default StatusCard;
