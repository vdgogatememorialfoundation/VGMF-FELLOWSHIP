"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import type { FormSchedulePhase, FormScheduleStatus } from "@/lib/form-schedule";
import { formatScheduleDateTime } from "@/lib/form-schedule";

type CountdownTarget = "opens" | "closes";

interface TimeLeft {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeTimeLeft(targetIso: string): TimeLeft {
  const totalMs = Math.max(0, new Date(targetIso).getTime() - Date.now());
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    totalMs,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function CountdownUnit({
  value,
  label,
  dark = false,
}: {
  value: number;
  label: string;
  dark?: boolean;
}) {
  return (
    <div
      className={
        dark
          ? "countdown-unit flex min-w-[4.5rem] flex-col items-center rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm"
          : "flex min-w-[4.5rem] flex-col items-center rounded-xl border border-primary-200 bg-white px-3 py-2.5 shadow-sm"
      }
    >
      <span
        className={`font-display text-2xl font-extrabold tabular-nums leading-none sm:text-3xl ${dark ? "text-white" : "text-primary-800"}`}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span
        className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${dark ? "text-white/80" : "text-gray-500"}`}
      >
        {label}
      </span>
    </div>
  );
}

interface FormScheduleCountdownProps {
  targetIso: string;
  target: CountdownTarget;
  formName?: string;
  onComplete?: () => void;
  variant?: "hero" | "card" | "compact";
}

export function FormScheduleCountdown({
  targetIso,
  target,
  formName,
  onComplete,
  variant = "card",
}: FormScheduleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => computeTimeLeft(targetIso));

  useEffect(() => {
    const tick = () => {
      const next = computeTimeLeft(targetIso);
      setTimeLeft(next);
      if (next.totalMs <= 0) onComplete?.();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetIso, onComplete]);

  const heading =
    target === "opens"
      ? `Applications open${formName ? ` for ${formName}` : ""} in`
      : "Application window closes in";

  const targetLabel = formatScheduleDateTime(targetIso);

  const units = (dark: boolean) => (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {timeLeft.days > 0 && <CountdownUnit value={timeLeft.days} label="Days" dark={dark} />}
      <CountdownUnit value={timeLeft.hours} label="Hours" dark={dark} />
      <CountdownUnit value={timeLeft.minutes} label="Mins" dark={dark} />
      <CountdownUnit value={timeLeft.seconds} label="Secs" dark={dark} />
    </div>
  );

  if (variant === "compact") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-800">
        <Clock className="h-3.5 w-3.5" />
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:
        {String(timeLeft.seconds).padStart(2, "0")}
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className="hero-countdown mt-8 rounded-2xl border border-primary-200/60 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
          <Clock className="h-4 w-4" />
          Scheduled opening
        </div>
        <p className="mt-3 font-display text-xl font-bold sm:text-2xl">{heading}</p>
        <div className="mt-6">{units(true)}</div>
        {targetLabel && (
          <p className="mt-5 text-sm text-white/80">
            Opens on <strong className="text-white">{targetLabel}</strong>
            {target === "opens" && " (IST)"}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700">
        <Clock className="h-5 w-5" />
      </div>
      <p className="mt-3 font-display text-lg font-bold text-gray-900">{heading}</p>
      <div className="mt-5">{units(false)}</div>
      {targetLabel && (
        <p className="mt-4 text-sm text-gray-600">
          {target === "opens" ? "Opens" : "Closes"} on{" "}
          <strong className="text-gray-900">{targetLabel}</strong>
        </p>
      )}
    </div>
  );
}

interface FormSchedulePanelProps {
  schedule: FormScheduleStatus;
  formName?: string;
  variant?: "hero" | "card" | "compact";
  onRefresh?: () => void;
}

export function FormSchedulePanel({
  schedule,
  formName,
  variant = "card",
  onRefresh,
}: FormSchedulePanelProps) {
  const handleComplete = () => {
    if (onRefresh) onRefresh();
    else window.location.reload();
  };

  if (schedule.phase === "upcoming" && schedule.opensAt) {
    return (
      <FormScheduleCountdown
        targetIso={schedule.opensAt}
        target="opens"
        formName={formName}
        variant={variant}
        onComplete={handleComplete}
      />
    );
  }

  if (schedule.phase === "open" || schedule.phase === "upcoming") {
    return null;
  }

  const tone =
    schedule.phase === "disabled"
      ? "border-gray-200 bg-gray-50 text-gray-800"
      : "border-amber-200 bg-amber-50 text-amber-900";

  if (variant === "compact") {
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
        {schedule.phase === "disabled" ? "Closed" : "Applications closed"}
      </span>
    );
  }

  return (
    <div className={`rounded-xl border p-5 ${tone}`}>
      <p className="font-semibold">
        {schedule.phase === "disabled"
          ? "Applications are currently unavailable"
          : "Applications are currently closed"}
      </p>
      {schedule.message && <p className="mt-2 text-sm">{schedule.message}</p>}
      {schedule.opensAt && schedule.phase === "closed" && (
        <p className="mt-2 text-xs opacity-80">
          Window was {formatScheduleDateTime(schedule.opensAt)} –{" "}
          {formatScheduleDateTime(schedule.closesAt) || "open"}
        </p>
      )}
    </div>
  );
}

export function getPublicApplicationCtaState(
  schedule: FormScheduleStatus | null,
  signupEnabled: boolean
): FormSchedulePhase | "register-only" {
  if (!schedule) return signupEnabled ? "register-only" : "disabled";
  if (schedule.phase === "open" && signupEnabled) return "open";
  if (schedule.phase === "upcoming" && signupEnabled) return "upcoming";
  if (signupEnabled && schedule.phase === "open") return "open";
  return schedule.phase;
}
