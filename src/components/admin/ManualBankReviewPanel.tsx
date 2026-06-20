"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { DocumentReviewControls } from "@/components/admin/DocumentReviewControls";

export function ManualBankReviewPanel({
  fellowshipId,
  onUpdated,
}: {
  fellowshipId: string;
  onUpdated?: () => void;
}) {
  const [status, setStatus] = useState("NOT_STARTED");
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [proof, setProof] = useState<{
    id: string;
    fileName: string;
    filePath: string;
    status: string;
    rejectionReason: string | null;
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/verification/manual/bank?fellowshipId=${encodeURIComponent(fellowshipId)}`
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load bank verification");
      return;
    }
    if (data.mode !== "manual") {
      setVisible(false);
      return;
    }
    setVisible(true);
    setStatus(data.status);
    setVerifiedAt(data.verifiedAt);
    setProof(
      data.proofDocument
        ? {
            id: data.proofDocument.id,
            fileName: data.proofDocument.fileName,
            filePath: data.proofDocument.filePath,
            status: data.proofDocument.status,
            rejectionReason: data.proofDocument.rejectionReason,
          }
        : null
    );
    setError("");
  }, [fellowshipId]);

  useEffect(() => {
    load();
  }, [load]);

  async function reviewProof(documentId: string, docStatus: string, reason?: string) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/fellowship/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, status: docStatus, rejectionReason: reason }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to update bank proof");
      return;
    }
    setMessage(`Bank proof marked as ${docStatus.replace(/_/g, " ").toLowerCase()}`);
    await load();
    onUpdated?.();
  }

  async function reviewBank(action: "approve" | "decline" | "request_resubmit") {
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/verification/manual/bank", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fellowshipId, action, notes }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to update bank verification");
      return;
    }
    setMessage(`Bank verification ${action.replace(/_/g, " ")}`);
    setNotes("");
    await load();
    onUpdated?.();
  }

  if (!visible) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Manual bank verification</h3>
        <p className="mt-1 text-sm text-gray-600">
          Review uploaded bank proof and account details when Digio penny-drop is disabled.
        </p>
        <p className="mt-2 text-sm text-gray-800">
          Status: <strong>{status.replace(/_/g, " ")}</strong>
          {verifiedAt && ` · Verified ${new Date(verifiedAt).toLocaleString("en-IN")}`}
        </p>
      </div>

      {proof ? (
        <DocumentReviewControls
          documentId={proof.id}
          label="Bank proof (cancelled cheque / passbook)"
          fileName={proof.fileName}
          filePath={proof.filePath}
          status={proof.status}
          rejectionReason={proof.rejectionReason}
          loading={loading}
          onReview={reviewProof}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
          Bank proof not uploaded yet.
        </p>
      )}

      <Textarea
        label="Notes for fellow (required to decline or request resubmission)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <Button loading={loading} onClick={() => reviewBank("approve")}>
          Approve bank account
        </Button>
        <Button variant="danger" loading={loading} onClick={() => reviewBank("decline")}>
          Reject bank verification
        </Button>
        <Button variant="secondary" loading={loading} onClick={() => reviewBank("request_resubmit")}>
          Request resubmission
        </Button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}
    </div>
  );
}
