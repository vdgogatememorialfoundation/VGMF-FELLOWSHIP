"use client";

import { Check, Circle, AlertTriangle, X } from "lucide-react";
import type { TrackingTimelineStep } from "@/lib/tracking-timeline";

function formatTimelineDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StepIcon({ state }: { state: TrackingTimelineStep["state"] }) {
  if (state === "complete") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white shadow-sm">
        <Check className="h-4 w-4 stroke-[3]" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary-400 opacity-30" />
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-primary-500 bg-white">
          <span className="h-2.5 w-2.5 rounded-full bg-primary-500" />
        </span>
      </span>
    );
  }
  if (state === "query") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
        <AlertTriangle className="h-4 w-4" />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
        <X className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#d8e4de] bg-white">
      <Circle className="h-3 w-3 text-[#c5d5cc]" />
    </span>
  );
}

export function FlipkartTrackingTimeline({ steps }: { steps: TrackingTimelineStep[] }) {
  const currentIdx = steps.findIndex((s) => s.state === "current" || s.state === "query");

  return (
    <div className="relative">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const lineComplete = step.state === "complete";
        const lineActive = index < currentIdx || step.state === "complete";

        return (
          <div key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <div
                className={`absolute left-[13px] top-8 h-[calc(100%-8px)] w-0.5 ${
                  lineActive ? "bg-primary-400" : "bg-[#e4ede8]"
                }`}
                aria-hidden
              />
            )}

            <StepIcon state={step.state} />

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`text-sm font-semibold ${
                    step.state === "complete"
                      ? "text-primary-800"
                      : step.state === "current"
                        ? "text-ink"
                        : step.state === "query"
                          ? "text-amber-900"
                          : "text-muted"
                  }`}
                >
                  {step.label}
                </p>
                {step.state === "current" && (
                  <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-700">
                    In progress
                  </span>
                )}
                {step.state === "query" && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                    Action needed
                  </span>
                )}
              </div>

              {(step.state === "current" || step.state === "query" || step.state === "pending") && (
                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{step.description}</p>
              )}

              {step.timestamp && step.state === "complete" && (
                <p className="mt-1 text-xs font-medium text-muted">
                  {formatTimelineDate(step.timestamp)}
                </p>
              )}

              {step.phase === "fellowship" && step.state === "current" && (
                <p className="mt-1 text-[11px] text-primary-600">Fellowship phase</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
