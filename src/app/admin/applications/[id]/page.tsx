"use client";

import { useState, useEffect, use } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { formatCurrency, SCORING_CRITERIA } from "@/lib/utils";

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [app, setApp] = useState<Record<string, unknown> | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [docRejection, setDocRejection] = useState("");
  const [selectedDoc, setSelectedDoc] = useState("");

  useEffect(() => {
    fetch(`/api/admin/applications?id=${id}`)
      .then((r) => r.json())
      .then((data) => setApp(data.application));
  }, [id]);

  async function updateStatus(status: string) {
    await fetch("/api/admin/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: id, status, rejectionReason }),
    });
    const res = await fetch(`/api/admin/applications?id=${id}`);
    const data = await res.json();
    setApp(data.application);
  }

  async function rejectDocument(documentId: string) {
    await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId,
        status: "RESUBMIT_REQUIRED",
        rejectionReason: docRejection,
      }),
    });
    const res = await fetch(`/api/admin/applications?id=${id}`);
    const data = await res.json();
    setApp(data.application);
    setSelectedDoc("");
    setDocRejection("");
  }

  if (!app) return <p className="py-12 text-center text-gray-500">Loading...</p>;

  const application = app as {
    applicationNumber: string;
    status: string;
    name: string;
    email: string;
    mobile: string;
    bamsCollege: string;
    currentDesignation: string;
    researchProposal: Record<string, string> | null;
    budget: Record<string, number> | null;
    documents: Array<{ id: string; type: string; status: string; filePath: string; fileName: string }>;
    committeeScores: Array<{ totalScore: number; committeeUser: { profile: { name: string } | null } }>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{application.applicationNumber}</h1>
          <p className="text-gray-600">{application.name}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3">
          <h2 className="font-semibold">Personal & Professional</h2>
          <div className="text-sm space-y-1">
            <p><strong>Email:</strong> {application.email}</p>
            <p><strong>Mobile:</strong> {application.mobile}</p>
            <p><strong>BAMS College:</strong> {application.bamsCollege}</p>
            <p><strong>Designation:</strong> {application.currentDesignation}</p>
          </div>
        </div>

        {application.researchProposal && (
          <div className="card space-y-3">
            <h2 className="font-semibold">Research Proposal</h2>
            <div className="text-sm space-y-1">
              <p><strong>Title:</strong> {application.researchProposal.projectTitle}</p>
              <p><strong>Area:</strong> {application.researchProposal.researchArea?.replace(/_/g, " ")}</p>
              <p><strong>Objectives:</strong> {application.researchProposal.objectives}</p>
            </div>
          </div>
        )}

        {application.budget && (
          <div className="card space-y-3">
            <h2 className="font-semibold">Budget</h2>
            <p className="text-lg font-bold text-primary-600">
              Total: {formatCurrency(application.budget.total)}
            </p>
          </div>
        )}

        <div className="card space-y-3">
          <h2 className="font-semibold">Documents</h2>
          {application.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{doc.type.replace(/_/g, " ")}</p>
                <a href={doc.filePath} target="_blank" className="text-xs text-primary-600 hover:underline">
                  {doc.fileName}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={doc.status} />
                <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => setSelectedDoc(doc.id)}>
                  Reject
                </Button>
              </div>
            </div>
          ))}
          {selectedDoc && (
            <div className="space-y-2 border-t pt-3">
              <Textarea
                label="Rejection Reason"
                value={docRejection}
                onChange={(e) => setDocRejection(e.target.value)}
              />
              <Button variant="danger" onClick={() => rejectDocument(selectedDoc)}>
                Request Resubmission
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Update Status</h2>
        <Textarea
          label="Rejection Reason / Notes"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {["UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_SCHEDULED", "SELECTED", "REJECTED", "WAITLISTED"].map((s) => (
            <Button key={s} variant="secondary" onClick={() => updateStatus(s)}>
              {s.replace(/_/g, " ")}
            </Button>
          ))}
        </div>
      </div>

      {application.committeeScores?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-3">Committee Scores</h2>
          {application.committeeScores.map((score, i) => (
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
