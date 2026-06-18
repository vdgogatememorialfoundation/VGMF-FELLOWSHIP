"use client";

import { Check } from "lucide-react";

type RailStep = {
  key: string;
  label: string;
  state: "complete" | "current" | "pending";
};

export function FlipkartProgressRail({ steps }: { steps: RailStep[] }) {
  const currentIdx = steps.findIndex((s) => s.state === "current");
  const progressPct =
    steps.length <= 1
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            ((currentIdx >= 0 ? currentIdx : steps.filter((s) => s.state === "complete").length) /
              (steps.length - 1)) *
              100
          )
        );

  return (
    <div className="w-full">
      <div className="relative mx-2 mb-3 h-1.5 rounded-full bg-[#e8f0ec]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-700 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex justify-between gap-1">
        {steps.map((step) => (
          <div key={step.key} className="flex min-w-0 flex-1 flex-col items-center">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                step.state === "complete"
                  ? "border-primary-500 bg-primary-500 text-white"
                  : step.state === "current"
                    ? "border-primary-500 bg-white shadow-[0_0_0_4px_rgba(63,191,136,0.25)]"
                    : "border-[#d8e4de] bg-white"
              }`}
            >
              {step.state === "complete" ? (
                <Check className="h-3 w-3 stroke-[3]" />
              ) : step.state === "current" ? (
                <span className="h-2 w-2 rounded-full bg-primary-500 tracker-pulse" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-[#c5d5cc]" />
              )}
            </div>
            <p
              className={`mt-1.5 hidden max-w-[4.5rem] text-center text-[9px] font-semibold leading-tight sm:block ${
                step.state === "current"
                  ? "text-primary-700"
                  : step.state === "complete"
                    ? "text-primary-600"
                    : "text-muted"
              }`}
            >
              {step.label.split(" ")[0]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
