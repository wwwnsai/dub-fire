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
    <div className="bg-white rounded-xl h-36 py-6 px-8 flex items-center justify-between">
      <div className="gap-2 flex flex-col">
        <p className="text-gray-600 text-sm sen-regular">
          Device: <span className="text-sm sen-medium">{device}</span>
        </p>
        <p
          className={`sen-semibold text-2xl ${
            status === "safe" ? "text-green-600" : "text-red-600"
          }`}
        >
          {status === "safe" ? "Safe" : "Fire Detected"}
        </p>
      </div>
      {status === "alert" && (
        <Image src={fire} alt="fire icon" width={80} height={80} />
      )}
    </div>
  );
};

export default StatusCard;
