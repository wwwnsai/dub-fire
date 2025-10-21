// components/SensorStatus.tsx
import { FC } from "react";

interface SensorStatusProps {
  lastCheck: string;
  humidity: string;
  temperature1: number;
  temperature2: number;
}

const SensorStatus: FC<SensorStatusProps> = ({ lastCheck, humidity, temperature1, temperature2 }) => {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      <div className="bg-white rounded-lg shadow-md p-4 h-24 flex flex-col justify-center items-center text-center">
        <p className="sen-regular text-xs text-gray-500">Last Tool Check Time</p>
        <p className="sen-regular text-2xl text-[#0A0F23]">{lastCheck}</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 h-24 flex flex-col justify-center items-center text-center">
        <p className="sen-regular text-xs text-gray-500">Humidity</p>
        <p className="sen-regular text-2xl text-[#0A0F23]">{humidity}</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 h-24 flex flex-col justify-center items-center text-center">
        <p className="sen-regular text-xs text-gray-500">Temperature</p>
        <p className="sen-regular text-2xl text-[#0A0F23]">{temperature1} °C</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 h-24 flex flex-col justify-center items-center text-center">
        <p className="sen-regular text-xs text-gray-500">Temperature</p>
        <p className="sen-regular text-2xl text-[#0A0F23]">{temperature2} °C</p>
      </div>
    </div>
  );
};

export default SensorStatus;
