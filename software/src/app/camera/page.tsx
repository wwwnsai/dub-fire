"use client";

import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import LiveCamera from "@/components/LiveCamera";
import { useEffect, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ShieldOff,
  Crosshair,
  Zap,
  ZapOff,
  OctagonX,
  Play,
  Minus,
  Plus,
  Loader2,
  Maximize2,
  X,
} from "lucide-react";

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

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${active ? "bg-green-500" : "bg-slate-300"}`} />
  );
}

function ToggleButton({
  active, onAction, onAction2, activeLabel, inactiveLabel,
  activeIcon: ActiveIcon, inactiveIcon: InactiveIcon, disabled,
}: {
  active: boolean; onAction: () => void; onAction2: () => void;
  activeLabel: string; inactiveLabel: string;
  activeIcon: React.ElementType; inactiveIcon: React.ElementType; disabled: boolean;
}) {
  return (
    <button
      className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-50 ${
        active ? "bg-primary-light text-white shadow-md" : "bg-slate-100 text-slate-600 border border-slate-200"
      }`}
      disabled={disabled}
      onClick={() => (active ? onAction2() : onAction())}
    >
      {active ? <ActiveIcon size={16} /> : <InactiveIcon size={16} />}
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

/** D-pad used both in normal view and fullscreen overlay */
function PanTiltPad({ onControl, busy, size = "normal" }: {
  onControl: (action: string) => void;
  busy: boolean;
  size?: "normal" | "large";
}) {
  const btnBase =
    size === "large"
      ? "flex h-14 w-14 items-center justify-center rounded-2xl disabled:opacity-50 transition active:scale-95"
      : "flex items-center justify-center rounded-2xl py-3 disabled:opacity-50 transition";
  const btnStyle = size === "large"
    ? "bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
    : "bg-slate-100 text-slate-700 hover:bg-slate-200";
  const iconSize = size === "large" ? 24 : 18;
  const gap = size === "large" ? "gap-3" : "gap-2";

  return (
    <div className={`grid grid-cols-3 ${gap} ${size === "large" ? "w-[180px]" : "max-w-[160px] mx-auto"}`}>
      <div />
      <button className={`${btnBase} ${btnStyle}`} disabled={busy} onClick={() => onControl("tilt_up")}>
        <ArrowUp size={iconSize} />
      </button>
      <div />
      <button className={`${btnBase} ${btnStyle}`} disabled={busy} onClick={() => onControl("pan_left")}>
        <ArrowLeft size={iconSize} />
      </button>
      <div className={`flex items-center justify-center rounded-2xl ${size === "large" ? "h-14 w-14 bg-white/10" : "py-3 bg-slate-50 border border-slate-200"}`}>
        <Crosshair size={size === "large" ? 20 : 16} className={size === "large" ? "text-white/50" : "text-slate-400"} />
      </div>
      <button className={`${btnBase} ${btnStyle}`} disabled={busy} onClick={() => onControl("pan_right")}>
        <ArrowRight size={iconSize} />
      </button>
      <div />
      <button className={`${btnBase} ${btnStyle}`} disabled={busy} onClick={() => onControl("tilt_down")}>
        <ArrowDown size={iconSize} />
      </button>
      <div />
    </div>
  );
}

/** Fullscreen overlay */
function FullscreenView({
  mode, onClose, sensor, onControl, onModeChange, busy,
}: {
  mode: "rgb" | "thermal";
  onClose: () => void;
  sensor: CameraSensorSnapshot;
  onControl: (action: string) => void;
  onModeChange: (m: "rgb" | "thermal") => void;
  busy: boolean;
}) {
  const isRgb = mode === "rgb";

  // Status pill helper
  const Pill = ({ label, active, danger }: { label: string; active: boolean; danger?: boolean }) => (
    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${
      danger && active ? "bg-red-600/80 text-white" :
      active ? "bg-white/20 text-white" : "bg-black/30 text-white/50"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${danger && active ? "bg-white" : active ? "bg-green-400" : "bg-white/30"}`} />
      {label}
    </span>
  );

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      {/* Feed */}
      <div className="relative flex-1 overflow-hidden">
        <img
          src={`${AI_BASE_URL}/${isRgb ? "rgb_feed" : "thermal_feed"}?_t=${Date.now()}`}
          alt="Live feed fullscreen"
          className="h-full w-full object-contain"
          referrerPolicy="no-referrer"
        />

        {/* Top bar */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between gap-2 p-4">
          {/* Mode toggle */}
          <div className="flex rounded-full bg-black/40 p-1 backdrop-blur-sm">
            <button
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${isRgb ? "bg-primary-light text-white" : "text-white/70"}`}
              onClick={() => onModeChange("rgb")}
            >RGB</button>
            <button
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${!isRgb ? "bg-primary-light text-white" : "text-white/70"}`}
              onClick={() => onModeChange("thermal")}
            >Thermal</button>
          </div>

          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5">
            <Pill label="Armed" active={!!sensor.isArmed} />
            <Pill label="Track" active={!!sensor.autoTrack} />
            <Pill label="Auto" active={!!sensor.autoShoot} />
            <Pill label="E-Stop" active={!!sensor.emergencyStop} danger />
          </div>

          {/* Close */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Bottom-right: pan/tilt */}
        <div className="absolute bottom-6 right-4">
          <PanTiltPad onControl={onControl} busy={busy} size="large" />
        </div>

        {/* Bottom-left: danger actions + FPS */}
        <div className="absolute bottom-6 left-4 flex flex-col gap-2">
          <span className="text-xs font-semibold text-white/50">
            {typeof sensor.fps === "number" ? `${sensor.fps} FPS` : ""}
          </span>
          <button
            className="flex items-center gap-2 rounded-2xl bg-red-600/80 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-red-600 disabled:opacity-50 transition active:scale-95"
            disabled={busy}
            onClick={() => onControl("shoot_now")}
          >
            <Zap size={16} /> Shoot Now
          </button>
          <button
            className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm disabled:opacity-50 transition active:scale-95 ${
              sensor.emergencyStop ? "bg-green-600/80 hover:bg-green-600" : "bg-amber-500/80 hover:bg-amber-500"
            }`}
            disabled={busy}
            onClick={() => onControl(sensor.emergencyStop ? "resume" : "emergency_stop")}
          >
            {sensor.emergencyStop ? <Play size={16} /> : <OctagonX size={16} />}
            {sensor.emergencyStop ? "Resume" : "E-Stop"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CameraPageClient() {
  const [mode, setMode] = useState<"rgb" | "thermal">("rgb");
  const [sensor, setSensor] = useState<CameraSensorSnapshot>({});
  const [isSending, setIsSending] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const isRgb = mode === "rgb";

  useEffect(() => {
    let cancelled = false;
    const loadSensor = async () => {
      try {
        const response = await fetch(`${AI_BASE_URL}/sensor`, { cache: "no-store" });
        if (!response.ok) return;
        const data: CameraSensorSnapshot = await response.json();
        if (!cancelled) setSensor(data);
      } catch {
        if (!cancelled) setSensor({});
      }
    };
    loadSensor();
    const intervalId = window.setInterval(loadSensor, 1000);
    return () => { cancelled = true; window.clearInterval(intervalId); };
  }, []);

  const sendControl = async (action: string) => {
    setIsSending(action);
    try {
      const response = await fetch(`${AI_BASE_URL}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Control request failed");
      if (payload?.state) setSensor(payload.state);
    } catch (error) {
      console.error("Control failed", error);
    } finally {
      setIsSending(null);
    }
  };

  const formatValue = (value: number | null | undefined, suffix = "") =>
    typeof value === "number" ? `${value.toFixed(1)}${suffix}` : "--";

  const busy = isSending !== null;

  return (
    <>
      {fullscreen && (
        <FullscreenView
          mode={mode}
          onClose={() => setFullscreen(false)}
          sensor={sensor}
          onControl={sendControl}
          onModeChange={setMode}
          busy={busy}
        />
      )}

      <Layout>
        <div className="mx-auto mt-2 grid max-w-4xl gap-6">

          {/* Mode toggle */}
          <div className="inline-flex self-start rounded-full bg-white p-1 shadow-[0px_4px_10px_rgba(0,0,0,0.10)]">
            <button
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${isRgb ? "bg-primary-light text-white shadow-sm" : "text-text-secondary"}`}
              onClick={() => setMode("rgb")}
            >RGB</button>
            <button
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${!isRgb ? "bg-primary-light text-white shadow-sm" : "text-text-secondary"}`}
              onClick={() => setMode("thermal")}
            >Thermal</button>
          </div>

          {/* Camera feed */}
          <div className="rounded-2xl bg-white p-4 shadow-[0px_4px_10px_rgba(0,0,0,0.12)]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-text-secondary">
                {isRgb ? "RGB Detection Feed" : "Thermal Detection Feed"}
              </p>
              <button
                className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
                onClick={() => setFullscreen(true)}
              >
                <Maximize2 size={13} /> Fullscreen
              </button>
            </div>
            <LiveCamera key={mode} src={`${AI_BASE_URL}/${isRgb ? "rgb_feed" : "thermal_feed"}`} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Controls */}
            <div className="rounded-2xl bg-white p-4 shadow-[0px_4px_10px_rgba(0,0,0,0.12)]">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-text-secondary">Controls</p>
                {busy && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Loader2 size={12} className="animate-spin" /> Sending…
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <ToggleButton active={!!sensor.isArmed} onAction={() => sendControl("arm")} onAction2={() => sendControl("disarm")} activeLabel="Armed" inactiveLabel="Arm" activeIcon={ShieldCheck} inactiveIcon={ShieldOff} disabled={busy} />
                <ToggleButton active={!!sensor.autoTrack} onAction={() => sendControl("track_on")} onAction2={() => sendControl("track_off")} activeLabel="Tracking" inactiveLabel="Track" activeIcon={Crosshair} inactiveIcon={Crosshair} disabled={busy} />
                <ToggleButton active={!!sensor.autoShoot} onAction={() => sendControl("shoot_on")} onAction2={() => sendControl("shoot_off")} activeLabel="Auto On" inactiveLabel="Auto Off" activeIcon={Zap} inactiveIcon={ZapOff} disabled={busy} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50" disabled={busy} onClick={() => sendControl("shoot_now")}>
                  <Zap size={16} /> Shoot Now
                </button>
                <button
                  className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${sensor.emergencyStop ? "bg-green-600 hover:bg-green-700" : "bg-amber-500 hover:bg-amber-600"}`}
                  disabled={busy} onClick={() => sendControl(sensor.emergencyStop ? "resume" : "emergency_stop")}
                >
                  {sensor.emergencyStop ? <Play size={16} /> : <OctagonX size={16} />}
                  {sensor.emergencyStop ? "Resume" : "E-Stop"}
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100">
                <span className="text-sm text-slate-600">Fire Threshold</span>
                <div className="flex items-center gap-2">
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50 transition" disabled={busy} onClick={() => sendControl("temp_down")}><Minus size={14} /></button>
                  <span className="min-w-[56px] text-center text-sm font-semibold text-slate-700">
                    {typeof sensor.fireTempMin === "number" ? `${sensor.fireTempMin}°C` : "--"}
                  </span>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50 transition" disabled={busy} onClick={() => sendControl("temp_up")}><Plus size={14} /></button>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-text-secondary">Pan / Tilt</p>
                <PanTiltPad onControl={sendControl} busy={busy} size="normal" />
              </div>
            </div>

            {/* Live Status */}
            <div className="rounded-2xl bg-white p-4 shadow-[0px_4px_10px_rgba(0,0,0,0.12)]">
              <p className="mb-3 text-sm font-semibold text-text-secondary">Live Status</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Armed", value: sensor.isArmed ? "Yes" : "No", bool: !!sensor.isArmed },
                  { label: "Tracking", value: sensor.autoTrack ? "On" : "Off", bool: !!sensor.autoTrack },
                  { label: "Auto Shoot", value: sensor.autoShoot ? "On" : "Off", bool: !!sensor.autoShoot },
                  { label: "E-Stop", value: sensor.emergencyStop ? "Active" : "Clear", bool: !sensor.emergencyStop, danger: !!sensor.emergencyStop },
                ].map(({ label, value, bool, danger }) => (
                  <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="text-sm text-slate-600">{label}</span>
                    <span className={`flex items-center gap-2 text-sm font-semibold ${danger ? "text-red-600" : "text-slate-700"}`}>
                      <StatusDot active={bool} />{value}
                    </span>
                  </div>
                ))}
                <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl bg-slate-50 px-3 py-3 text-sm">
                  {[
                    { label: "Shot Count", value: String(sensor.shotCount ?? 0) },
                    { label: "FPS", value: String(sensor.fps ?? "--") },
                    { label: "Temperature", value: formatValue(sensor.temperature_c, "°C") },
                    { label: "Humidity", value: formatValue(sensor.humidity, "%") },
                    { label: "Pitch", value: formatValue(sensor.imu_pitch, "°") },
                    { label: "Roll", value: formatValue(sensor.imu_roll, "°") },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col">
                      <span className="text-xs text-slate-400">{label}</span>
                      <span className="font-semibold text-slate-700">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

export default dynamic(() => Promise.resolve(CameraPageClient), {
  ssr: false,
  loading: () => <CameraPageSkeleton />,
});
