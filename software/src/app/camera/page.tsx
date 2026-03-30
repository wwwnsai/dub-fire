"use client";

import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import LiveCamera from "@/components/LiveCamera";
import { useEffect, useState } from "react";

const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_BASE_URL || "http://127.0.0.1:5001";

type CameraSensorSnapshot = {
  temperature_c?: number | null;
  humidity?: number | null;
  imu_pitch?: number | null;
  imu_roll?: number | null;
  updated_at?: string | null;
  source?: string;
  isArmed?: boolean;
  autoTrack?: boolean;
  autoShoot?: boolean;
  emergencyStop?: boolean;
  shotCount?: number;
  fireTempMin?: number;
  fps?: number;
};

function CameraPageSkeleton() {
  return (
    <Layout>
      <div className="mx-auto mt-2 grid max-w-4xl gap-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 rounded-full bg-white shadow-[0px_4px_10px_rgba(0,0,0,0.10)]" />
          <div className="h-10 w-32 rounded-full bg-white shadow-[0px_4px_10px_rgba(0,0,0,0.10)]" />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-[0px_4px_10px_rgba(0,0,0,0.12)]">
          <div className="mb-2 h-5 w-40 rounded bg-slate-200" />
          <div className="aspect-video w-full rounded-2xl bg-black/80" />
        </div>
      </div>
    </Layout>
  );
}

function CameraPageClient() {
  const [mode, setMode] = useState<"rgb" | "thermal">("rgb");
  const [sensor, setSensor] = useState<CameraSensorSnapshot>({});
  const [isSending, setIsSending] = useState<string | null>(null);
  const isRgb = mode === "rgb";

  useEffect(() => {
    let cancelled = false;

    const loadSensor = async () => {
      try {
        const response = await fetch(`${AI_BASE_URL}/sensor`, { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data: CameraSensorSnapshot = await response.json();
        if (!cancelled) {
          setSensor(data);
        }
      } catch {
        if (!cancelled) {
          setSensor({});
        }
      }
    };

    loadSensor();
    const intervalId = window.setInterval(loadSensor, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const sendControl = async (action: string) => {
    setIsSending(action);
    try {
      const response = await fetch(`${AI_BASE_URL}/control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Control request failed");
      }

      if (payload?.state) {
        setSensor(payload.state);
      }
    } catch (error) {
      console.error("Control failed", error);
    } finally {
      setIsSending(null);
    }
  };

  const formatValue = (value: number | null | undefined, suffix = "") =>
    typeof value === "number" ? `${value.toFixed(1)}${suffix}` : "--";

  return (
    <Layout>
      <div className="mx-auto mt-2 grid max-w-4xl gap-6">
        <div className="flex items-center gap-3">
          <button
            className={`rounded-full px-4 py-2 text-sm sen-semibold transition ${
              isRgb
                ? "bg-primary-light text-white"
                : "bg-white text-text-secondary shadow-[0px_4px_10px_rgba(0,0,0,0.10)]"
            }`}
            onClick={() => setMode("rgb")}
          >
            RGB Mode
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm sen-semibold transition ${
              !isRgb
                ? "bg-primary-light text-white"
                : "bg-white text-text-secondary shadow-[0px_4px_10px_rgba(0,0,0,0.10)]"
            }`}
            onClick={() => setMode("thermal")}
          >
            Thermal Mode
          </button>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-[0px_4px_10px_rgba(0,0,0,0.12)]">
          <p className="mb-2 text-sm sen-semibold text-text-secondary">
            {isRgb ? "RGB Detection Feed" : "Thermal Detection Feed"}
          </p>
          <LiveCamera
            key={mode}
            src={`${AI_BASE_URL}/${isRgb ? "rgb_feed" : "thermal_feed"}`}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-[0px_4px_10px_rgba(0,0,0,0.12)]">
            <p className="mb-3 text-sm sen-semibold text-text-secondary">Controls</p>
            <div className="grid grid-cols-2 gap-3">
              <button className="rounded-full bg-primary-light px-4 py-2 text-sm text-white disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl("arm")}>Arm</button>
              <button className="rounded-full bg-slate-200 px-4 py-2 text-sm text-slate-800 disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl("disarm")}>Disarm</button>
              <button className="rounded-full bg-primary-light px-4 py-2 text-sm text-white disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl("track_on")}>Track On</button>
              <button className="rounded-full bg-slate-200 px-4 py-2 text-sm text-slate-800 disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl("track_off")}>Track Off</button>
              <button className="rounded-full bg-primary-light px-4 py-2 text-sm text-white disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl("shoot_on")}>Auto Shoot On</button>
              <button className="rounded-full bg-slate-200 px-4 py-2 text-sm text-slate-800 disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl("shoot_off")}>Auto Shoot Off</button>
              <button className="rounded-full bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl("shoot_now")}>Shoot Now</button>
              <button className="rounded-full bg-amber-500 px-4 py-2 text-sm text-white disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl(sensor.emergencyStop ? "resume" : "emergency_stop")}>
                {sensor.emergencyStop ? "Resume" : "E-Stop"}
              </button>
              <button className="rounded-full bg-slate-200 px-4 py-2 text-sm text-slate-800 disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl("temp_down")}>Temp -10C</button>
              <button className="rounded-full bg-slate-200 px-4 py-2 text-sm text-slate-800 disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl("temp_up")}>Temp +10C</button>
            </div>

            <div className="mt-4">
              <p className="mb-3 text-sm sen-semibold text-text-secondary">Pan / Tilt</p>
              <div className="mx-auto grid max-w-[220px] grid-cols-3 gap-3">
                <div />
                <button className="rounded-2xl bg-slate-200 px-4 py-3 text-sm text-slate-800 disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl("tilt_up")}>Up</button>
                <div />
                <button className="rounded-2xl bg-slate-200 px-4 py-3 text-sm text-slate-800 disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl("pan_left")}>Left</button>
                <button className="rounded-2xl bg-primary-light px-4 py-3 text-sm text-white disabled:opacity-60" disabled>
                  Pan/Tilt
                </button>
                <button className="rounded-2xl bg-slate-200 px-4 py-3 text-sm text-slate-800 disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl("pan_right")}>Right</button>
                <div />
                <button className="rounded-2xl bg-slate-200 px-4 py-3 text-sm text-slate-800 disabled:opacity-60" disabled={isSending !== null} onClick={() => sendControl("tilt_down")}>Down</button>
                <div />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-[0px_4px_10px_rgba(0,0,0,0.12)]">
            <p className="mb-3 text-sm sen-semibold text-text-secondary">Live Status</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-700">
              <span>Armed</span><span>{sensor.isArmed ? "Yes" : "No"}</span>
              <span>Tracking</span><span>{sensor.autoTrack ? "On" : "Off"}</span>
              <span>Auto Shoot</span><span>{sensor.autoShoot ? "On" : "Off"}</span>
              <span>E-Stop</span><span>{sensor.emergencyStop ? "Active" : "Clear"}</span>
              <span>Shot Count</span><span>{sensor.shotCount ?? 0}</span>
              <span>Threshold</span><span>{typeof sensor.fireTempMin === "number" ? `${sensor.fireTempMin}C` : "--"}</span>
              <span>FPS</span><span>{sensor.fps ?? "--"}</span>
              <span>Temperature</span><span>{formatValue(sensor.temperature_c, "C")}</span>
              <span>Humidity</span><span>{formatValue(sensor.humidity, "%")}</span>
              <span>Pitch</span><span>{formatValue(sensor.imu_pitch, "°")}</span>
              <span>Roll</span><span>{formatValue(sensor.imu_roll, "°")}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default dynamic(() => Promise.resolve(CameraPageClient), {
  ssr: false,
  loading: () => <CameraPageSkeleton />,
});
