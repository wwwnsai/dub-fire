// components/LiveCamera.tsx
import { FC } from "react";

interface LiveCameraProps {
  src: string;
}

const LiveCamera: FC<LiveCameraProps> = ({ src }) => {
  return (
    <div className="mt-6">
      <div className="rounded-lg overflow-hidden shadow">
        <img
          src={src}
          alt="Live camera"
          className="w-full h-auto"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};

export default LiveCamera;
