"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DocStatusBadge } from "@/components/ui/DocStatusBadge";
import { documentBorderClass } from "@/lib/document-review";

type IdentityDoc = {
  type: string;
  label: string;
  uploaded: boolean;
  status: string | null;
  fileName: string | null;
  filePath: string | null;
  rejectionReason: string | null;
  documentId: string | null;
};

type ManualIdentityState = {
  status: string;
  verifiedAt: string | null;
  verificationNotes: string | null;
  documents: IdentityDoc[];
  canSubmit: boolean;
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ManualIdentityVerificationPanel({
  applicationId,
  disabled = false,
  onStatusChange,
}: {
  applicationId: string;
  disabled?: boolean;
  onStatusChange?: (status: string) => void;
}) {
  const [state, setState] = useState<ManualIdentityState | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/verification/manual/identity?applicationId=${encodeURIComponent(applicationId)}`
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load verification status");
      return;
    }
    setState(data);
    onStatusChange?.(data.status);
    setError("");
  }, [applicationId, onStatusChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadDocument(type: string, file: File) {
    setUploading(type);
    setError("");
    const formData = new FormData();
    formData.append("applicationId", applicationId);
    formData.append("type", type);
    formData.append("file", file);

    const res = await fetch("/api/documents", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(null);

    if (!res.ok) {
      setError(data.error || "Upload failed");
      return;
    }

    await load();
  }

  async function submitForReview() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/verification/manual/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, action: "submit" }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to submit for review");
      return;
    }

    await load();
  }

  if (!state) {
    return <p className="text-sm text-gray-500">Loading manual verification...</p>;
  }

  const canUpload =
    !disabled &&
    state.status !== "APPROVED" &&
    state.status !== "IN_REVIEW";

  const canSubmit = !disabled && state.canSubmit;

  return (
    <div className="space-y-4 rounded-lg border border-primary-100 bg-primary-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Manual identity verification</h3>
          <p className="mt-1 text-sm text-gray-600">
            Upload a clear government ID and a recent photo. The Foundation team will verify these
            documents manually while online Digio verification is disabled.
          </p>
        </div>
        <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
          {formatStatus(state.status)}
        </span>
      </div>

      {state.status === "APPROVED" && state.verifiedAt && (
        <p className="text-sm text-green-800">
          Identity verified on {new Date(state.verifiedAt).toLocaleString("en-IN")}.
        </p>
      )}

      {state.status === "IN_REVIEW" && (
        <p className="text-sm text-blue-800">
          Your documents are with the verification team. No action is needed right now.
        </p>
      )}

      {(state.status === "DECLINED" || state.verificationNotes) && state.verificationNotes && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <span className="font-medium">Foundation note:</span> {state.verificationNotes}
        </p>
      )}

      <div className="space-y-3">
        {state.documents.map((doc) => {
          const border = doc.status ? documentBorderClass(doc.status) : "border-gray-200 bg-white";
          const canReplace =
            canUpload ||
            doc.status === "REJECTED" ||
            doc.status === "RESUBMIT_REQUIRED" ||
            !doc.uploaded;

          return (
            <div key={doc.type} className={`rounded-lg border p-4 ${border}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{doc.label}</p>
                  {doc.fileName && doc.filePath && (
                    <a
                      href={doc.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-xs text-primary-600 hover:underline"
                    >
                      {doc.fileName}
                    </a>
                  )}
                  {doc.rejectionReason && (
                    <p className="mt-1 text-xs text-red-700">Reason: {doc.rejectionReason}</p>
                  )}
                </div>
                {doc.status ? <DocStatusBadge status={doc.status} /> : null}
              </div>

              {canReplace && (
                <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                  {uploading === doc.type
                    ? "Uploading..."
                    : doc.uploaded
                      ? "Replace file"
                      : "Upload file"}
                  <input
                    type="file"
                    accept=".pdf,application/pdf,image/*"
                    className="hidden"
                    disabled={Boolean(uploading) || loading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadDocument(doc.type, file);
                    }}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>

      {canSubmit && (
        <Button loading={loading} onClick={submitForReview}>
          Submit for manual verification
        </Button>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
