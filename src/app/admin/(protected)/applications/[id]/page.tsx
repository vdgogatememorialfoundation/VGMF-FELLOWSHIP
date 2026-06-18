"use client";

import { useState, useEffect, use } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DocStatusBadge } from "@/components/ui/DocStatusBadge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { formatCurrency } from "@/lib/utils";
import { formatApplicationNumber } from "@/lib/application-number";
import { InterviewSchedulePanel } from "@/components/admin/InterviewSchedulePanel";
import { ReviewAssignmentPanel } from "@/components/admin/ReviewAssignmentPanel";
import { ApplicationQueryPanel } from "@/components/reviews/ApplicationQueryPanel";
import { AdminFellowshipPanel } from "@/components/admin/AdminFellowshipPanel";
import {
  canApproveScrutiny,
  getNextActions,
  getDocumentLabel,
  allDocumentsApproved,
  ADMIN_ACTION_LABELS,
  getAdminPhase,
} from "@/lib/application-workflow";

type ApplicationDocument = {
  id: string;
  type: string;
  status: string;
  filePath: string;
  fileName: string;
  rejectionReason?: string | null;
};

type ApplicationData = {
  id: string;
  applicationNumber: string;
  status: string;
  name: string;
  email: string;
  mobile: string;
  bamsCollege: string;
  currentDesignation: string;
  registrationCouncil: string;
  registrationNumber: string;
  city: string;
  state: string;
  pincode: string;
  rejectionReason?: string | null;
  adminNotes?: string | null;
  queryNotes?: string | null;
  eligibilityNotes?: string | null;
  verificationNotes?: string | null;
  researchProposal: Record<string, string> | null;
  budget: { total: number } | null;
  documents: ApplicationDocument[];
  committeeScores: Array<{ totalScore: number; committeeUser: { profile: { name: string } | null } }>;
  interview: {
    scheduledDate: string;
    scheduledTime: string;
    meetingLink: string;
    panelMembers: string;
    notes?: string | null;
  } | null;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    notes: string | null;
    createdAt: string;
  }>;
};

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [app, setApp] = useState<ApplicationData | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [docRejection, setDocRejection] = useState("");
  const [selectedDoc, setSelectedDoc] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function reload() {
    const res = await fetch(`/api/admin/applications?id=${id}`);
    const data = await res.json();
    setApp(data.application);
  }

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 15000);
    return () => clearInterval(timer);
  }, [id]);

  async function updateStatus(status: string) {
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/admin/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: id,
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : undefined,
        adminNotes,
        queryNotes: status === "QUERY_RAISED" ? adminNotes : undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to update status");
      return;
    }

    setMessage(`Status updated to ${status.replace(/_/g, " ")}`);
    await reload();
  }

  async function reviewDocument(documentId: string, status: string, reason?: string) {
    setLoading(true);
    setError("");

    const res = await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId,
        status,
        rejectionReason: reason,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to update document");
      return;
    }

    setSelectedDoc("");
    setDocRejection("");
    setMessage(`Document marked as ${status.replace(/_/g, " ")}`);
    await reload();
  }

  if (!app) return <p className="py-12 text-center text-gray-500">Loading application...</p>;

  const scrutinyCheck = canApproveScrutiny(app.status as never, app.documents);
  const nextActions = getNextActions(app.status as never);
  const docsApproved = allDocumentsApproved(app.documents);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-wide">{app.applicationNumber}</h1>
          {/^\d{12}$/.test(app.applicationNumber) && (
            <p className="text-sm text-gray-500">{formatApplicationNumber(app.applicationNumber)}</p>
          )}
          <p className="mt-1 text-gray-600">{app.name}</p>
        </div>
        <StatusBadge status={app.status} />
      </div>
      <p className="text-sm text-gray-500">
        Workflow phase: <strong>{getAdminPhase(app.status as never)}</strong>
      </p>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      <ReviewAssignmentPanel applicationId={id} onUpdated={reload} />

      <AdminFellowshipPanel
        applicationId={id}
        budgetTotal={app.budget?.total}
        onUpdated={reload}
      />

      {app.queryNotes && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <h2 className="font-semibold text-orange-900">Open Query</h2>
          <p className="mt-2 text-sm text-orange-800">{app.queryNotes}</p>
        </div>
      )}

      <div className="card">
        <h2 className="mb-4 font-semibold">Admin Query Actions</h2>
        <ApplicationQueryPanel applicationId={id} phase="VERIFICATION" canRaise canResolve onUpdated={reload} />
      </div>

      {app.status === "SCRUTINY" && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">Administrative Scrutiny</h2>
          <p className="mt-1 text-sm text-amber-800">
            Verify all applicant details and approve each document. Final scrutiny approval is only
            available when every document is approved.
          </p>
          <p className="mt-2 text-sm font-medium text-amber-900">
            Documents approved: {app.documents.filter((d) => d.status === "APPROVED").length} /{" "}
            {app.documents.length}
          </p>
          {!scrutinyCheck.ok && (
            <p className="mt-2 text-sm text-amber-700">{scrutinyCheck.reason}</p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3">
          <h2 className="font-semibold">Personal & Professional</h2>
          <div className="space-y-1 text-sm">
            <p><strong>Email:</strong> {app.email}</p>
            <p><strong>Mobile:</strong> {app.mobile}</p>
            <p><strong>Location:</strong> {app.city}, {app.state} — {app.pincode}</p>
            <p><strong>BAMS College:</strong> {app.bamsCollege}</p>
            <p><strong>Designation:</strong> {app.currentDesignation}</p>
            <p><strong>Registration:</strong> {app.registrationCouncil} — {app.registrationNumber}</p>
          </div>
        </div>

        {app.researchProposal && (
          <div className="card space-y-3">
            <h2 className="font-semibold">Research Proposal</h2>
            <div className="space-y-1 text-sm">
              <p><strong>Title:</strong> {app.researchProposal.projectTitle}</p>
              <p><strong>Area:</strong> {app.researchProposal.researchArea?.replace(/_/g, " ")}</p>
              <p><strong>Objectives:</strong> {app.researchProposal.objectives}</p>
            </div>
          </div>
        )}

        {app.budget && (
          <div className="card space-y-3">
            <h2 className="font-semibold">Budget</h2>
            <p className="text-lg font-bold text-primary-600">
              Total: {formatCurrency(app.budget.total)}
            </p>
          </div>
        )}

        <div className="card space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Document Scrutiny</h2>
            {docsApproved && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                All documents approved
              </span>
            )}
          </div>
          {app.documents.length === 0 ? (
            <p className="text-sm text-gray-500">No documents uploaded yet.</p>
          ) : (
            app.documents.map((doc) => (
              <div
                key={doc.id}
                className={`rounded-xl border p-4 ${
                  doc.status === "RESUBMIT_REQUIRED"
                    ? "border-orange-200 bg-orange-50"
                    : doc.status === "APPROVED"
                      ? "border-green-200 bg-green-50/40"
                      : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{getDocumentLabel(doc.type)}</p>
                    <a
                      href={doc.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline"
                    >
                      {doc.fileName}
                    </a>
                    {doc.rejectionReason && (
                      <p className="mt-1 text-xs text-orange-700">Reason: {doc.rejectionReason}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DocStatusBadge status={doc.status} />
                    {doc.status !== "APPROVED" && (
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        loading={loading}
                        onClick={() => reviewDocument(doc.id, "APPROVED")}
                      >
                        Approve
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => setSelectedDoc(doc.id)}
                    >
                      Request resubmit
                    </Button>
                  </div>
                </div>
                {selectedDoc === doc.id && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <Textarea
                      label="Reason for resubmission"
                      value={docRejection}
                      onChange={(e) => setDocRejection(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        loading={loading}
                        onClick={() =>
                          reviewDocument(doc.id, "RESUBMIT_REQUIRED", docRejection)
                        }
                      >
                        Send back to applicant
                      </Button>
                      <Button variant="secondary" onClick={() => setSelectedDoc("")}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Status & Final Approval</h2>
        {["SHORTLISTED", "UNDER_REVIEW", "WAITLISTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED", "TECHNICAL_SCORING"].includes(
          app.status
        ) && (
          <InterviewSchedulePanel
            applicationId={id}
            existing={app.interview}
            onScheduled={reload}
          />
        )}
        <Textarea
          label="Admin notes"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
        />
        <Textarea
          label="Rejection reason (required when rejecting)"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {nextActions.map((action) => {
            const isScrutinyApprove = action === "SCRUTINY_APPROVED";
            const disabled = isScrutinyApprove && !scrutinyCheck.ok;
            return (
              <Button
                key={action}
                variant={action === "REJECTED" ? "danger" : "secondary"}
                disabled={disabled}
                loading={loading}
                onClick={() => updateStatus(action)}
              >
                {ADMIN_ACTION_LABELS[action] ?? action.replace(/_/g, " ")}
              </Button>
            );
          })}
          {nextActions.length === 0 && (
            <p className="text-sm text-gray-500">
              No further status transitions available from this stage.
            </p>
          )}
        </div>
      </div>

      {app.statusHistory?.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Status History</h2>
          <div className="space-y-3">
            {app.statusHistory.map((entry) => (
              <div key={entry.id} className="border-b pb-3 text-sm last:border-0">
                <p className="font-medium">
                  {entry.fromStatus ? `${entry.fromStatus} → ` : ""}
                  {entry.toStatus.replace(/_/g, " ")}
                </p>
                {entry.notes && <p className="text-gray-600">{entry.notes}</p>}
                <p className="text-xs text-gray-400">
                  {new Date(entry.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {app.committeeScores?.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Committee Scores</h2>
          {app.committeeScores.map((score, i) => (
            <div key={i} className="flex justify-between border-b py-2 text-sm last:border-0">
              <span>{score.committeeUser.profile?.name ?? "Committee Member"}</span>
              <span className="font-medium">{score.totalScore}/100</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
