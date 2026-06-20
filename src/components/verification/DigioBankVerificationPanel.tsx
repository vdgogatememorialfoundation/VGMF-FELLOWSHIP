"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-green-50 text-green-800 border-green-200",
  DECLINED: "bg-red-50 text-red-800 border-red-200",
  IN_REVIEW: "bg-blue-50 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-900 border-amber-200",
  NOT_STARTED: "bg-gray-50 text-gray-700 border-gray-200",
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DigioBankVerificationPanel({
  fellowshipId,
  disabled = false,
  onStatusChange,
}: {
  fellowshipId?: string;
  disabled?: boolean;
  onStatusChange?: (status: string) => void;
}) {
  const [configured, setConfigured] = useState(false);
  const [status, setStatus] = useState("NOT_STARTED");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    const query = fellowshipId ? `?fellowshipId=${encodeURIComponent(fellowshipId)}` : "";
    const res = await fetch(`/api/digio/bank-verify${query}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load bank verification status");
      return;
    }
    setConfigured(Boolean(data.configured));
    setStatus(data.status ?? "NOT_STARTED");
    onStatusChange?.(data.status ?? "NOT_STARTED");
    setError("");
  }, [fellowshipId, onStatusChange]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function verifyBankAccount() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/digio/bank-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fellowshipId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bank verification failed");
        return;
      }
      setStatus(data.status ?? "NOT_STARTED");
      onStatusChange?.(data.status ?? "NOT_STARTED");
      await loadStatus();
    } finally {
      setLoading(false);
    }
  }

  if (!configured) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-800">Bank account verification</p>
        <p className="mt-1">
          Online bank verification is not active. The Foundation will verify your bank details
          manually after submission.
        </p>
      </div>
    );
  }

  const canVerify = !disabled && status !== "APPROVED";

  return (
    <div className="space-y-3 rounded-lg border border-primary-100 bg-primary-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Bank account verification</h3>
          <p className="mt-1 text-sm text-gray-600">
            Verify your submitted bank account using Digio penny drop (IMPS). A small transfer
            confirms the account holder name matches your records.
          </p>
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
          Your bank account has been verified successfully.
        </p>
      )}

      {status === "DECLINED" && (
        <p className="text-sm text-red-800">
          Bank verification did not pass. Check your account number, IFSC, and account holder name,
          then try again.
        </p>
      )}

      {canVerify && (
        <Button loading={loading} onClick={verifyBankAccount}>
          {status === "NOT_STARTED" ? "Verify bank account" : "Retry verification"}
        </Button>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
