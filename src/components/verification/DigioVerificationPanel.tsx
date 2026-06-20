"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IdentityVerificationTracker } from "@/components/verification/IdentityVerificationTracker";

type VerificationPurpose = "APPLICANT_IDENTITY" | "BANK_ACCOUNT" | "UNDERTAKING_IDENTITY";

type VerificationState = {
  configured: boolean;
  status: string;
  environment?: string;
  session: {
    id: string;
    status: string;
    customerIdentifier: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

type DigioSdkInstance = {
  init: () => void;
  submit: (requestId: string, identifier: string, tokenId?: string) => void;
};

declare global {
  interface Window {
    Digio?: new (options: Record<string, unknown>) => DigioSdkInstance;
  }
}

const DIGIO_SDK_URL = "https://ext-app.digio.in/sdk/v10/digio.js";

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

let sdkLoadPromise: Promise<void> | null = null;

function loadDigioSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Digio) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${DIGIO_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Digio SDK")));
      return;
    }

    const script = document.createElement("script");
    script.src = DIGIO_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Digio SDK"));
    document.body.appendChild(script);
  });

  return sdkLoadPromise;
}

interface DigioVerificationPanelProps {
  purpose: VerificationPurpose;
  title: string;
  description: string;
  applicationId?: string;
  fellowshipId?: string;
  disabled?: boolean;
  onStatusChange?: (status: string) => void;
  showTracking?: boolean;
  verifiedAt?: string | null;
}

export function DigioVerificationPanel({
  purpose,
  title,
  description,
  applicationId,
  fellowshipId,
  disabled = false,
  onStatusChange,
  showTracking = true,
  verifiedAt = null,
}: DigioVerificationPanelProps) {
  const [state, setState] = useState<VerificationState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [polling, setPolling] = useState(false);
  const digioRef = useRef<DigioSdkInstance | null>(null);

  const query = new URLSearchParams({ purpose });
  if (applicationId) query.set("applicationId", applicationId);
  if (fellowshipId) query.set("fellowshipId", fellowshipId);

  const queryString = query.toString();

  const loadStatus = useCallback(async () => {
    const res = await fetch(`/api/digio/session?${queryString}`);
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

  async function launchDigioFlow(data: {
    requestId: string;
    customerIdentifier: string;
    accessToken?: string | null;
    environment?: string;
  }) {
    await loadDigioSdk();
    if (!window.Digio) {
      throw new Error("Digio Web SDK is not available");
    }

    const digio = new window.Digio({
      environment: data.environment === "sandbox" ? "sandbox" : "production",
      is_iframe: true,
      callback: (response: { error_code?: number | string }) => {
        if (response?.error_code) {
          setError("Verification was cancelled or failed. You can try again.");
        }
        setPolling(true);
        loadStatus();
      },
      theme: {
        primaryColor: "#1e3a5f",
        secondaryColor: "#111827",
      },
    });

    digio.init();
    digioRef.current = digio;
    digio.submit(
      data.requestId,
      data.customerIdentifier,
      data.accessToken ?? undefined
    );
  }

  async function startVerification(forceNew = false) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/digio/session", {
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

      if (!data.requestId || !data.customerIdentifier) {
        setError("Digio response was incomplete. Check API Settings.");
        return;
      }

      setPolling(true);
      await launchDigioFlow(data);
      await loadStatus();
    } catch (launchError) {
      setError(
        launchError instanceof Error ? launchError.message : "Could not launch Digio verification"
      );
    } finally {
      setLoading(false);
    }
  }

  if (!state) {
    return <p className="text-sm text-gray-500">Loading verification...</p>;
  }

  if (!state.configured) {
    const inactiveCopy =
      purpose === "APPLICANT_IDENTITY"
        ? "Digio is not configured yet. The Foundation can still verify identity manually from your submitted documents until online verification is enabled."
        : "Online verification is not active. Submit your documents as instructed — the Foundation will verify manually.";

    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-800">{title}</p>
        <p className="mt-1">{inactiveCopy}</p>
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
