"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { DocumentReviewControls } from "@/components/admin/DocumentReviewControls";

type IdentityDoc = {
  type: string;
  label: string;
  documentId: string | null;
  fileName: string | null;
  filePath: string | null;
  status: string | null;
  rejectionReason: string | null;
};

export function ManualIdentityReviewPanel({
  applicationId,
  onUpdated,
}: {
  applicationId: string;
  onUpdated?: () => void;
}) {
  const [status, setStatus] = useState("NOT_STARTED");
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState<string | null>(null);
  const [documents, setDocuments] = useState<IdentityDoc[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/verification/manual/identity?applicationId=${encodeURIComponent(applicationId)}`
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load manual identity verification");
      return;
    }
    if (data.mode !== "manual") return;
    setStatus(data.status);
    setVerifiedAt(data.verifiedAt);
    setVerificationNotes(data.verificationNotes);
    setDocuments(data.documents ?? []);
    setError("");
  }, [applicationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function reviewDocument(documentId: string, docStatus: string, reason?: string) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, status: docStatus, rejectionReason: reason }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to update document");
      return;
    }
    setMessage(`Document marked as ${docStatus.replace(/_/g, " ").toLowerCase()}`);
    await load();
    onUpdated?.();
  }

  async function reviewIdentity(action: "approve" | "decline" | "request_resubmit") {
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/verification/manual/identity", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, action, notes }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to update identity verification");
      return;
    }
    setMessage(`Identity verification ${action.replace(/_/g, " ")}`);
    setNotes("");
    await load();
    onUpdated?.();
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Manual identity verification</h3>
        <p className="mt-1 text-sm text-gray-600">
          Review uploaded government ID and photo. Approve, reject, or request resubmission when
          Digio online verification is disabled.
        </p>
        <p className="mt-2 text-sm text-gray-800">
          Status: <strong>{status.replace(/_/g, " ")}</strong>
          {verifiedAt && ` · Verified ${new Date(verifiedAt).toLocaleString("en-IN")}`}
        </p>
        {verificationNotes && (
          <p className="mt-1 text-sm text-amber-800">Previous note: {verificationNotes}</p>
        )}
      </div>

      {documents.map((doc) =>
        doc.documentId && doc.fileName && doc.filePath && doc.status ? (
          <DocumentReviewControls
            key={doc.type}
            documentId={doc.documentId}
            label={doc.label}
            fileName={doc.fileName}
            filePath={doc.filePath}
            status={doc.status}
            rejectionReason={doc.rejectionReason}
            loading={loading}
            onReview={reviewDocument}
          />
        ) : (
          <div key={doc.type} className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
            {doc.label} — not uploaded yet
          </div>
        )
      )}

      <Textarea
        label="Notes for applicant (required to decline or request resubmission)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <Button loading={loading} onClick={() => reviewIdentity("approve")}>
          Approve identity
        </Button>
        <Button variant="danger" loading={loading} onClick={() => reviewIdentity("decline")}>
          Reject identity
        </Button>
        <Button variant="secondary" loading={loading} onClick={() => reviewIdentity("request_resubmit")}>
          Request resubmission
        </Button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}
    </div>
  );
}
