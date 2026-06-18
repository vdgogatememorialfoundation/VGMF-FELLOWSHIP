"use client";

import { useState } from "react";
import { INSTALLMENT_REQUIREMENTS } from "@/lib/installment-requirements";
import { getDocumentStatusLabel } from "@/lib/document-review";

type Requirement = {
  key: string;
  label: string;
  satisfied: boolean;
  status?: string;
  filePath?: string | null;
  detail?: string;
};

export function InstallmentDocumentsPanel({
  fellowshipId,
  installmentNo,
  onUploaded,
}: {
  fellowshipId: string;
  installmentNo: number;
  onUploaded: () => void;
}) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const fellowUploads = (INSTALLMENT_REQUIREMENTS[installmentNo] ?? []).filter(
    (r) => r.source === "fellow"
  );

  async function loadRequirements() {
    const res = await fetch(
      `/api/fellowship/documents?fellowshipId=${fellowshipId}&installmentNo=${installmentNo}`
    );
    const data = await res.json();
    setRequirements(data.requirements || []);
    setLoaded(true);
  }

  if (!loaded) {
    void loadRequirements();
  }

  async function upload(type: string, file: File) {
    setUploading(type);
    setError("");
    const formData = new FormData();
    formData.append("fellowshipId", fellowshipId);
    formData.append("installmentNo", String(installmentNo));
    formData.append("type", type);
    formData.append("file", file);

    const res = await fetch("/api/fellowship/documents", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(null);

    if (!res.ok) {
      setError(data.error || "Upload failed");
      return;
    }

    await loadRequirements();
    onUploaded();
  }

  if (fellowUploads.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900">
        Installment {installmentNo} — required documents
      </h3>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 space-y-4">
        {fellowUploads.map((req) => {
          const status = requirements.find((r) => r.key === req.key);
          const docStatus = status?.status;
          const canReupload =
            !status?.satisfied &&
            (!status?.filePath ||
              docStatus === "REJECTED" ||
              docStatus === "RESUBMIT_REQUIRED");
          const statusClass =
            docStatus === "REJECTED"
              ? "text-red-700"
              : docStatus === "RESUBMIT_REQUIRED"
                ? "text-orange-700"
                : status?.satisfied
                  ? "text-green-700"
                  : docStatus === "PENDING"
                    ? "text-amber-700"
                    : "text-gray-500";

          return (
            <div
              key={req.key}
              className={`rounded-lg p-3 ${
                docStatus === "REJECTED"
                  ? "bg-red-50"
                  : docStatus === "RESUBMIT_REQUIRED"
                    ? "bg-orange-50"
                    : "bg-gray-50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{req.label}</p>
                <span className={`text-xs font-medium ${statusClass}`}>
                  {status?.satisfied
                    ? "Approved"
                    : docStatus
                      ? getDocumentStatusLabel(docStatus)
                      : "Not uploaded"}
                </span>
              </div>
              {status?.detail && !status.satisfied && (
                <p className="mt-1 text-xs text-red-700">{status.detail}</p>
              )}
              {status?.filePath && (
                <a
                  href={status.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-primary-600 underline"
                >
                  View uploaded file
                </a>
              )}
              {canReupload && (
                <label className="mt-2 block cursor-pointer text-xs font-medium text-primary-700 hover:underline">
                  {uploading === req.type
                    ? "Uploading…"
                    : status?.filePath
                      ? "Re-upload file"
                      : "Upload file"}
                  <input
                    type="file"
                    accept=".pdf,application/pdf,image/*"
                    className="hidden"
                    disabled={uploading === req.type}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void upload(req.type, file);
                    }}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
