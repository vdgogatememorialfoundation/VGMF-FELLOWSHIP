"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { FlipkartTrackingTimeline } from "@/components/tracking/FlipkartTrackingTimeline";
import {
  buildIdentityVerificationDetailSteps,
  getIdentityVerificationStatusLabel,
} from "@/lib/identity-verification-tracking";
import type { TrackingTimelineStep } from "@/lib/tracking-timeline";

type IdentityStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "APPROVED"
  | "DECLINED"
  | "IN_REVIEW"
  | "ABANDONED"
  | "EXPIRED";

interface IdentityVerificationTrackerProps {
  status: IdentityStatus;
  verifiedAt?: string | null;
  sessionUpdatedAt?: string | null;
  sessionStartedAt?: string | null;
  showTrackingLink?: boolean;
}

export function IdentityVerificationTracker({
  status,
  verifiedAt = null,
  sessionUpdatedAt = null,
  sessionStartedAt = null,
  showTrackingLink = true,
}: IdentityVerificationTrackerProps) {
  const steps: TrackingTimelineStep[] = buildIdentityVerificationDetailSteps({
    status,
    verifiedAt,
    sessionUpdatedAt,
    sessionStartedAt,
  });

  const currentStep = steps.find((step) => step.state === "current" || step.state === "failed");

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8f0ec] bg-white shadow-[0_4px_24px_rgba(27,107,82,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eef4f0] bg-[#fafdfb] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Verification tracking
            </p>
            <p className="font-semibold text-ink">Identity verification progress</p>
            <p className="mt-1 text-sm text-ink-soft">
              {currentStep?.label ?? "Tracking your verification steps"}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status === "APPROVED"
              ? "bg-green-100 text-green-800"
              : status === "DECLINED"
                ? "bg-red-100 text-red-800"
                : status === "IN_REVIEW"
                  ? "bg-blue-100 text-blue-800"
                  : status === "IN_PROGRESS"
                    ? "bg-amber-100 text-amber-900"
                    : "bg-gray-100 text-gray-700"
          }`}
        >
          {getIdentityVerificationStatusLabel(status)}
        </span>
      </div>

      <div className="px-4 py-5 sm:px-5">
        <FlipkartTrackingTimeline steps={steps} />
      </div>

      {showTrackingLink && (
        <div className="border-t border-[#eef4f0] bg-[#f6fbf8] px-4 py-3 text-sm text-gray-600 sm:px-5">
          See the full application journey on{" "}
          <Link href="/applicant/status" className="font-semibold text-primary-700 hover:underline">
            Application Tracking
          </Link>
          .
        </div>
      )}
    </div>
  );
}
