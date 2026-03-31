// components/LiveCamera.tsx
import { FC, useEffect, useRef, useState } from "react";

interface LiveCameraProps {
  src: string;
}

const MAX_RETRIES = 8;

function cacheBust(src: string) {
  return `${src}${src.includes("?") ? "&" : "?"}_t=${Date.now()}`;
}

const LiveCamera: FC<LiveCameraProps> = ({ src }) => {
  const [activeSrc, setActiveSrc] = useState("");
  const [connecting, setConnecting] = useState(false);
  const retriesRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetryTimer = () => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const connect = (delayMs: number) => {
    clearRetryTimer();
    setConnecting(true);
    setActiveSrc("");
    retryTimerRef.current = setTimeout(() => {
      setActiveSrc(cacheBust(src));
    }, delayMs);
  };

  // Reset and reconnect whenever src changes
  useEffect(() => {
    retriesRef.current = 0;
    connect(300);

    return () => {
      clearRetryTimer();
      setActiveSrc("");
      setConnecting(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const handleError = () => {
    if (retriesRef.current >= MAX_RETRIES) return;
    retriesRef.current += 1;
    // Back off: 400ms, 700ms, 1s, 1s, 1s ...
    const delay = Math.min(400 + (retriesRef.current - 1) * 300, 1000);
    connect(delay);
  };

  const handleLoad = () => {
    setConnecting(false);
    retriesRef.current = 0;
  };

  return (
    <div className="mt-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-[0px_4px_10px_0px_rgba(0,0,0,0.20)]">
        {activeSrc && (
          <img
            key={activeSrc}
            src={activeSrc}
            alt="Live camera"
            className="h-full w-full object-contain"
            referrerPolicy="no-referrer"
            onError={handleError}
            onLoad={handleLoad}
          />
        )}
        {connecting && !activeSrc && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-white/40">Connecting…</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveCamera;
