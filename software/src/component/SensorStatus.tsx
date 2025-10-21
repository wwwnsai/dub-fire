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
      <div className="bg-white rounded-lg shadow-md p-3 text-center">
        <p className="text-sm text-gray-500">Last Tool Check Time</p>
        <p className="text-lg font-bold">{lastCheck}</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-3 text-center">
        <p className="text-sm text-gray-500">Humidity</p>
        <p className="text-lg font-bold">{humidity}</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-3 text-center">
        <p className="text-sm text-gray-500">Temperature</p>
        <p className="text-lg font-bold">{temperature1} °C</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-3 text-center">
        <p className="text-sm text-gray-500">Temperature</p>
        <p className="text-lg font-bold">{temperature2} °C</p>
      </div>
    </div>
  );
};

export default SensorStatus;
