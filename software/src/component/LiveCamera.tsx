// components/LiveCamera.tsx
import { FC } from "react";

interface LiveCameraProps {
  src: string;
}

const LiveCamera: FC<LiveCameraProps> = ({ src }) => {
  return (
    <div className="mt-6">
      <p className="text-gray-700 mb-2 font-semibold">Live Camera</p>
      <div className="rounded-lg overflow-hidden shadow">
        <img src={src} alt="Live camera" className="w-full h-auto" />
      </div>
    </div>
  );
};

export default LiveCamera;
