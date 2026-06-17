"use client";

import { useState } from "react";
import { INSTALLMENT_REQUIREMENTS } from "@/lib/installment-requirements";

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
    const formData = new FormData();
    formData.append("fellowshipId", fellowshipId);
    formData.append("installmentNo", String(installmentNo));
    formData.append("type", type);
    formData.append("file", file);

    await fetch("/api/fellowship/documents", { method: "POST", body: formData });
    setUploading(null);
    await loadRequirements();
    onUploaded();
  }

  if (fellowUploads.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900">
        Installment {installmentNo} — required documents
      </h3>
      <div className="mt-3 space-y-4">
        {fellowUploads.map((req) => {
          const status = requirements.find((r) => r.key === req.key);
          return (
            <div key={req.key} className="rounded-lg bg-gray-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{req.label}</p>
                <span
                  className={`text-xs font-medium ${
                    status?.satisfied
                      ? "text-green-700"
                      : status?.status === "PENDING"
                        ? "text-amber-700"
                        : "text-gray-500"
                  }`}
                >
                  {status?.satisfied
                    ? "Approved"
                    : status?.status === "PENDING"
                      ? "Awaiting staff approval"
                      : "Not uploaded"}
                </span>
              </div>
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
              {!status?.satisfied && (
                <input
                  type="file"
                  accept=".pdf,application/pdf,image/*"
                  className="mt-2 block w-full text-xs"
                  disabled={uploading === req.type}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(req.type, file);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
