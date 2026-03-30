// components/LiveCamera.tsx
import { FC, useEffect, useState } from "react";

interface LiveCameraProps {
  src: string;
}

const LiveCamera: FC<LiveCameraProps> = ({ src }) => {
  const [activeSrc, setActiveSrc] = useState("");

  useEffect(() => {
    setActiveSrc("");

    const timer = window.setTimeout(() => {
      // Cache-bust forces a fresh connection — needed for MJPEG streams where
      // the browser may not close the previous persistent connection fast enough.
      const cacheBustedSrc = `${src}${src.includes("?") ? "&" : "?"}_t=${Date.now()}`;
      setActiveSrc(cacheBustedSrc);
    }, 300);

    return () => {
      window.clearTimeout(timer);
      setActiveSrc("");
    };
  }, [src]);

  return (
    <div className="mt-3">
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-[0px_4px_10px_0px_rgba(0,0,0,0.20)]">
        {activeSrc ? (
          <img
            src={activeSrc}
            alt="Live camera"
            className="h-full w-full object-contain"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </div>
    </div>
  );
};

export default LiveCamera;
