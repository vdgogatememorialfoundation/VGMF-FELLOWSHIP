"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { formatApplicationNumber } from "@/lib/application-number";
import { formatNumericId } from "@/lib/format-ids";
import { InterviewSchedulePanel } from "@/components/admin/InterviewSchedulePanel";
import { ReviewAssignmentPanel } from "@/components/admin/ReviewAssignmentPanel";
import { ApplicationQueryPanel } from "@/components/reviews/ApplicationQueryPanel";
import { AdminFellowshipPanel } from "@/components/admin/AdminFellowshipPanel";
import { AdminApplicationEditor } from "@/components/admin/AdminApplicationEditor";
import { AdminIdentityVerificationPanel } from "@/components/admin/AdminIdentityVerificationPanel";
import { DocumentReviewControls } from "@/components/admin/DocumentReviewControls";
import { ManualIdentityReviewPanel } from "@/components/admin/ManualIdentityReviewPanel";
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
  dob: string;
  gender: string;
  address: string;
  email: string;
  mobile: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  bamsCollege: string;
  yearOfPassing: number;
  mdMsPhdDetails?: string | null;
  currentDesignation: string;
  institutionName: string;
  registrationCouncil: string;
  registrationNumber: string;
  yearsOfPractice: number;
  viddhakarmaExperience?: string | null;
  publicationsSummary?: string | null;
  submittedAt?: string | null;
  createdAt?: string;
  rejectionReason?: string | null;
  adminNotes?: string | null;
  queryNotes?: string | null;
  eligibilityNotes?: string | null;
  verificationNotes?: string | null;
  identityVerificationStatus?: string;
  identityVerifiedAt?: string | null;
  user: {
    id: string;
    userId: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    profile: { name: string } | null;
  };
  researchProposal: {
    projectTitle: string;
    researchArea: string;
    researchAreaOther?: string | null;
    objectives: string;
    methodology: string;
    sampleSize: string;
    studyDuration: string;
    expectedOutcomes: string;
    budgetSummary: string;
  } | null;
  budget: {
    equipment: number;
    consumables: number;
    travel: number;
    documentation: number;
    publication: number;
    other: number;
    total: number;
  } | null;
  digitalUndertaking?: { id: string; submittedAt: string; fullName: string } | null;
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
  const router = useRouter();
  const [app, setApp] = useState<ApplicationData | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [verificationMeta, setVerificationMeta] = useState<{
    requireIdentityForScrutiny: boolean;
    identityConfigured: boolean;
  } | null>(null);
  const [verificationSessions, setVerificationSessions] = useState<
    Array<{
      id: string;
      providerRequestId: string;
      provider: string;
      purpose: "APPLICANT_IDENTITY" | "BANK_ACCOUNT" | "UNDERTAKING_IDENTITY";
      status: string;
      completedAt: string | null;
      createdAt: string;
      decisionJson: unknown;
    }>
  >([]);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/admin/applications?id=${id}`);
    const data = await res.json();
    setPageLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to load application");
      setApp(null);
      return;
    }
    setApp(data.application);
    setVerificationMeta(data.verification ?? null);
    setVerificationSessions(data.verificationSessions ?? []);
    setAdminNotes(data.application.adminNotes ?? "");
    setRejectionReason(data.application.rejectionReason ?? "");
  }, [id]);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 15000);
    return () => clearInterval(timer);
  }, [id, reload]);

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

  async function deleteApplicationRecord() {
    if (!app) return;

    const confirmed = window.confirm(
      `Permanently delete application ${app.applicationNumber}?\n\nThis removes all documents, committee scores, fellowship records, released installments, and finance data. This cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch(
      `/api/admin/applications?applicationId=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to delete application");
      return;
    }

    router.push("/admin/applications");
    router.refresh();
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

    setMessage(`Document marked as ${status.replace(/_/g, " ")}`);
    await reload();
  }

  async function reuploadApplicationDocument(docType: string, file: File) {
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("applicationId", id);
    formData.append("type", docType);
    formData.append("file", file);
    const res = await fetch("/api/documents", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to re-upload document");
      return;
    }
    setMessage(`${file.name} re-uploaded — pending review`);
    await reload();
  }

  if (pageLoading) {
    return <p className="py-12 text-center text-gray-500">Loading application...</p>;
  }

  if (!app) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-gray-500">{error || "Application not found"}</p>
        <Link href="/admin/applications" className="text-primary-600 underline">
          Back to applications
        </Link>
      </div>
    );
  }

  const scrutinyCheck = canApproveScrutiny(app.status as never, app.documents, {
    requireIdentityVerification:
      !!verificationMeta?.requireIdentityForScrutiny && !!verificationMeta?.identityConfigured,
    identityVerificationStatus: app.identityVerificationStatus,
  });
  const nextActions = getNextActions(app.status as never);
  const docsApproved = allDocumentsApproved(app.documents);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/applications" className="text-sm text-primary-600 hover:underline">
            ← All applications
          </Link>
          <h1 className="mt-2 font-mono text-2xl font-bold tracking-wide">{app.applicationNumber}</h1>
          {/^\d{12}$/.test(app.applicationNumber) && (
            <p className="text-sm text-gray-500">{formatApplicationNumber(app.applicationNumber)}</p>
          )}
          <p className="mt-1 text-gray-600">{app.name}</p>
          {app.submittedAt && (
            <p className="mt-1 text-xs text-gray-500">
              Submitted {new Date(app.submittedAt).toLocaleString("en-IN")}
            </p>
          )}
        </div>
        <StatusBadge status={app.status} />
      </div>
      <p className="text-sm text-gray-500">
        Workflow phase: <strong>{getAdminPhase(app.status as never)}</strong>
      </p>

      <div className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Applicant account</p>
          <Link
            href={`/admin/applicants/${app.user.id}`}
            className="mt-1 block font-medium text-primary-600 hover:underline"
          >
            {app.user.profile?.name ?? app.name}
          </Link>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">User ID</p>
          <p className="mt-1 font-mono text-sm">{formatNumericId(app.user.userId)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Account email</p>
          <p className="mt-1 text-sm">{app.user.email}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Digital undertaking</p>
          <p className="mt-1 text-sm">
            {app.digitalUndertaking ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  Submitted {new Date(app.digitalUndertaking.submittedAt).toLocaleDateString("en-IN")}
                </span>
                <span className="text-gray-300">|</span>
                <a
                  href={`/api/undertaking/${app.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary-600 hover:underline"
                >
                  View PDF
                </a>
              </div>
            ) : (
              "Not submitted"
            )}
          </p>
        </div>
      </div>

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
          {verificationMeta?.identityConfigured && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-white p-4">
              <p className="text-sm font-medium text-gray-900">Identity verification</p>
              <p className="mt-1 text-sm text-gray-600">
                Status:{" "}
                <strong>{(app.identityVerificationStatus ?? "NOT_STARTED").replace(/_/g, " ")}</strong>
                {app.identityVerifiedAt &&
                  ` · Verified ${new Date(app.identityVerifiedAt).toLocaleString("en-IN")}`}
              </p>
              {verificationMeta.requireIdentityForScrutiny && (
                <p className="mt-2 text-xs text-amber-800">
                  Required before marking documents verified (enabled in API Settings).
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {verificationMeta?.identityConfigured && (
        <div className="card space-y-4">
          <h2 className="font-semibold">Verification Details</h2>
          <AdminIdentityVerificationPanel
            sessions={verificationSessions}
            identityStatus={app.identityVerificationStatus}
            identityVerifiedAt={app.identityVerifiedAt}
          />
        </div>
      )}

      {!verificationMeta?.identityConfigured && (
        <div className="card space-y-4">
          <h2 className="font-semibold">Manual Identity Verification</h2>
          <ManualIdentityReviewPanel applicationId={id} onUpdated={reload} />
        </div>
      )}

      <AdminApplicationEditor application={app} onSaved={reload} />

      <div className="grid gap-6 lg:grid-cols-2">
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
              <DocumentReviewControls
                key={doc.id}
                documentId={doc.id}
                label={getDocumentLabel(doc.type)}
                fileName={doc.fileName}
                filePath={doc.filePath}
                status={doc.status}
                rejectionReason={doc.rejectionReason}
                loading={loading}
                onReview={reviewDocument}
                onReupload={(file) => reuploadApplicationDocument(doc.type, file)}
              />
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

      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <h2 className="font-semibold text-red-900">Delete Application</h2>
        <p className="mt-2 text-sm text-red-800">
          Permanently remove this application, including fellowship and fund records even if
          installments were released. The applicant account is not deleted.
        </p>
        <Button
          variant="danger"
          className="mt-4"
          loading={loading}
          onClick={deleteApplicationRecord}
        >
          Delete Application Permanently
        </Button>
      </div>
    </div>
  );
}
