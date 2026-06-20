"use client";

import { useCallback, useEffect, useState } from "react";
import { DiditSdk } from "@didit-protocol/sdk-web";
import { Button } from "@/components/ui/Button";
import { IdentityVerificationTracker } from "@/components/verification/IdentityVerificationTracker";

type DiditPurpose = "APPLICANT_IDENTITY" | "BANK_ACCOUNT" | "UNDERTAKING_IDENTITY";

type VerificationState = {
  configured: boolean;
  status: string;
  session: {
    id: string;
    status: string;
    verificationUrl: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-green-50 text-green-800 border-green-200",
  DECLINED: "bg-red-50 text-red-800 border-red-200",
  IN_REVIEW: "bg-blue-50 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-900 border-amber-200",
  ABANDONED: "bg-gray-50 text-gray-700 border-gray-200",
  EXPIRED: "bg-gray-50 text-gray-700 border-gray-200",
  NOT_STARTED: "bg-gray-50 text-gray-700 border-gray-200",
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface DiditVerificationPanelProps {
  purpose: DiditPurpose;
  title: string;
  description: string;
  applicationId?: string;
  fellowshipId?: string;
  disabled?: boolean;
  onStatusChange?: (status: string) => void;
  showTracking?: boolean;
  verifiedAt?: string | null;
}

export function DiditVerificationPanel({
  purpose,
  title,
  description,
  applicationId,
  fellowshipId,
  disabled = false,
  onStatusChange,
  showTracking = true,
  verifiedAt = null,
}: DiditVerificationPanelProps) {
  const [state, setState] = useState<VerificationState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [polling, setPolling] = useState(false);

  const query = new URLSearchParams({ purpose });
  if (applicationId) query.set("applicationId", applicationId);
  if (fellowshipId) query.set("fellowshipId", fellowshipId);

  const queryString = query.toString();

  const loadStatus = useCallback(async () => {
    const res = await fetch(`/api/didit/session?${queryString}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load verification status");
      return;
    }
    setState(data);
    onStatusChange?.(data.status);
    setError("");
  }, [queryString, onStatusChange]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(loadStatus, 5000);
    return () => clearInterval(timer);
  }, [polling, loadStatus]);

  useEffect(() => {
    DiditSdk.shared.onComplete = (result) => {
      if (result.type === "completed" || result.type === "cancelled") {
        setPolling(true);
        loadStatus();
      }
    };

    return () => {
      DiditSdk.shared.onComplete = undefined;
    };
  }, [loadStatus]);

  async function startVerification(forceNew = false) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/didit/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          applicationId,
          fellowshipId,
          forceNew,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start verification");
        return;
      }

      const verificationUrl = data.verificationUrl || data.url;
      if (!verificationUrl) {
        setError(data.error || "Verification URL missing from Didit response");
        return;
      }

      setPolling(true);
      DiditSdk.shared.startVerification({
        url: verificationUrl,
        configuration: {
          closeModalOnComplete: true,
        },
      });
      await loadStatus();
    } finally {
      setLoading(false);
    }
  }

  if (!state) {
    return <p className="text-sm text-gray-500">Loading verification...</p>;
  }

  if (!state.configured) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-800">{title}</p>
        <p className="mt-1">
          Online verification is not active. Submit your documents as instructed — the Foundation
          will verify manually.
        </p>
      </div>
    );
  }

  const status = state.status;
  const canStart = !disabled && !["APPROVED", "IN_REVIEW"].includes(status);
  const canRetry = !disabled && ["DECLINED", "ABANDONED", "EXPIRED"].includes(status);

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-primary-100 bg-primary-50/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              STATUS_STYLES[status] ?? STATUS_STYLES.NOT_STARTED
            }`}
          >
            {formatStatus(status)}
          </span>
        </div>

        {status === "APPROVED" && (
          <p className="text-sm text-green-800">
            Verification completed successfully. No further action is required for this step.
          </p>
        )}

        {status === "IN_REVIEW" && (
          <p className="text-sm text-blue-800">
            Your verification is under manual review. We will notify you when it is complete.
          </p>
        )}

        {canStart && (
          <Button loading={loading} onClick={() => startVerification(false)}>
            {status === "NOT_STARTED" ? "Start verification" : "Continue verification"}
          </Button>
        )}

        {canRetry && (
          <Button loading={loading} variant="secondary" onClick={() => startVerification(true)}>
            Start new verification
          </Button>
        )}

        {polling && !["APPROVED", "DECLINED", "IN_REVIEW"].includes(status) && (
          <p className="text-xs text-gray-500">Checking for updates...</p>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>

      {showTracking && purpose === "APPLICANT_IDENTITY" && (
        <IdentityVerificationTracker
          status={
            status as
              | "NOT_STARTED"
              | "IN_PROGRESS"
              | "APPROVED"
              | "DECLINED"
              | "IN_REVIEW"
              | "ABANDONED"
              | "EXPIRED"
          }
          verifiedAt={verifiedAt ?? state.session?.completedAt ?? null}
          sessionUpdatedAt={state.session?.updatedAt ?? null}
          sessionStartedAt={state.session?.createdAt ?? null}
        />
      )}
    </div>
  );
}
