"use client";

import { useCallback, useEffect, useState } from "react";
import { DocStatusBadge } from "@/components/ui/DocStatusBadge";
import { documentBorderClass } from "@/lib/document-review";

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ManualBankVerificationPanel({
  fellowshipId,
  bankSubmitted,
  disabled = false,
  onStatusChange,
}: {
  fellowshipId: string;
  bankSubmitted: boolean;
  disabled?: boolean;
  onStatusChange?: (status: string) => void;
}) {
  const [status, setStatus] = useState("NOT_STARTED");
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [proof, setProof] = useState<{
    fileName: string;
    filePath: string;
    status: string;
    rejectionReason: string | null;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/verification/manual/bank?fellowshipId=${encodeURIComponent(fellowshipId)}`
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load bank verification status");
      return;
    }
    setStatus(data.status ?? "NOT_STARTED");
    setVerifiedAt(data.verifiedAt ?? null);
    setProof(
      data.proofDocument
        ? {
            fileName: data.proofDocument.fileName,
            filePath: data.proofDocument.filePath,
            status: data.proofDocument.status,
            rejectionReason: data.proofDocument.rejectionReason,
          }
        : null
    );
    onStatusChange?.(data.status ?? "NOT_STARTED");
    setError("");
  }, [fellowshipId, onStatusChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadProof(file: File) {
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("fellowshipId", fellowshipId);
    formData.append("installmentNo", "1");
    formData.append("type", "BANK_VERIFICATION");
    formData.append("file", file);

    const res = await fetch("/api/fellowship/documents", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error || "Upload failed");
      return;
    }

    await load();
  }

  if (!bankSubmitted) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
        Submit your bank details above first, then upload cancelled cheque or passbook proof here.
      </div>
    );
  }

  const canUpload =
    !disabled &&
    status !== "APPROVED" &&
    (!proof || proof.status === "REJECTED" || proof.status === "RESUBMIT_REQUIRED");

  return (
    <div className="space-y-3 rounded-lg border border-primary-100 bg-primary-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Manual bank verification</h3>
          <p className="mt-1 text-sm text-gray-600">
            Upload a cancelled cheque or bank passbook page showing your account details. The
            Foundation will verify manually while online Digio bank verification is disabled.
          </p>
        </div>
        <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
          {formatStatus(status)}
        </span>
      </div>

      {status === "APPROVED" && verifiedAt && (
        <p className="text-sm text-green-800">
          Bank account verified on {new Date(verifiedAt).toLocaleString("en-IN")}.
        </p>
      )}

      {status === "IN_REVIEW" && (
        <p className="text-sm text-blue-800">
          Your bank proof is with the Foundation team for manual verification.
        </p>
      )}

      <div
        className={`rounded-lg border p-4 ${
          proof?.status ? documentBorderClass(proof.status) : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-gray-900">Bank proof (cancelled cheque / passbook)</p>
            {proof?.fileName && proof.filePath && (
              <a
                href={proof.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-xs text-primary-600 hover:underline"
              >
                {proof.fileName}
              </a>
            )}
            {proof?.rejectionReason && (
              <p className="mt-1 text-xs text-red-700">Reason: {proof.rejectionReason}</p>
            )}
          </div>
          {proof?.status ? <DocStatusBadge status={proof.status} /> : null}
        </div>

        {canUpload && (
          <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
            {uploading ? "Uploading..." : proof ? "Replace proof" : "Upload proof"}
            <input
              type="file"
              accept=".pdf,application/pdf,image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadProof(file);
              }}
            />
          </label>
        )}
      </div>

      {proof && proof.status === "PENDING" && status !== "APPROVED" && (
        <p className="text-sm text-amber-800">
          Proof uploaded — awaiting Foundation review. You will be notified if resubmission is needed.
        </p>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
