"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { DocStatusBadge } from "@/components/ui/DocStatusBadge";
import { documentBorderClass } from "@/lib/document-review";
import { DocumentFileLink } from "@/components/admin/DocumentFileLink";

type DocumentReviewControlsProps = {
  documentId: string;
  fileName: string;
  filePath: string;
  label: string;
  status: string;
  rejectionReason?: string | null;
  loading?: boolean;
  onReview: (documentId: string, status: string, reason?: string) => Promise<void>;
  onReupload?: (file: File) => Promise<void>;
  reuploadAccept?: string;
};

export function DocumentReviewControls({
  documentId,
  fileName,
  filePath,
  label,
  status,
  rejectionReason,
  loading,
  onReview,
  onReupload,
  reuploadAccept = ".pdf,application/pdf,image/*",
}: DocumentReviewControlsProps) {
  const [reason, setReason] = useState(rejectionReason || "");
  const [showActions, setShowActions] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleReupload(file: File) {
    if (!onReupload) return;
    setUploading(true);
    try {
      await onReupload(file);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${documentBorderClass(status)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <DocumentFileLink
            href={filePath}
            fileName={fileName}
            className="mt-1 block truncate text-left text-xs text-primary-600 hover:underline"
          />
          {rejectionReason && (
            <p className="mt-1 text-xs text-red-700">Reason: {rejectionReason}</p>
          )}
        </div>
        <DocStatusBadge status={status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {status !== "APPROVED" && (
          <Button
            variant="secondary"
            className="px-2 py-1 text-xs"
            loading={loading}
            onClick={() => onReview(documentId, "APPROVED")}
          >
            Approve
          </Button>
        )}
        <Button
          variant="secondary"
          className="px-2 py-1 text-xs"
          onClick={() => setShowActions((v) => !v)}
        >
          Reject / Resubmit
        </Button>
        {onReupload && (
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
            {uploading ? "Uploading…" : "Re-upload file"}
            <input
              type="file"
              accept={reuploadAccept}
              className="hidden"
              disabled={uploading || loading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleReupload(file);
              }}
            />
          </label>
        )}
      </div>

      {showActions && (
        <div className="mt-3 space-y-2 border-t pt-3">
          <Textarea
            label="Reason (required for reject / resubmit)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              className="px-2 py-1 text-xs"
              loading={loading}
              onClick={() => onReview(documentId, "REJECTED", reason)}
            >
              Mark Rejected
            </Button>
            <Button
              variant="secondary"
              className="px-2 py-1 text-xs"
              loading={loading}
              onClick={() => onReview(documentId, "RESUBMIT_REQUIRED", reason)}
            >
              Request Resubmission
            </Button>
            <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setShowActions(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
