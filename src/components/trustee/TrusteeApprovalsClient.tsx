"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TrusteeApprovalActions } from "@/components/trustee/TrusteeApprovalActions";
import { ApplicationQueryPanel } from "@/components/reviews/ApplicationQueryPanel";
import { formatCurrency } from "@/lib/utils";
import { formatApplicationNumber } from "@/lib/application-number";

type TrusteeApp = {
  id: string;
  applicationNumber: string;
  status: string;
  user: { profile: { name: string } | null };
  researchProposal: { projectTitle: string } | null;
  budget: { total: number } | null;
  committeeScores: Array<{ totalScore: number }>;
  committeeRemarks: Array<{
    remark: string;
    committeeUser: { profile: { name: string } | null };
  }>;
  trusteeApproval: { approved: boolean; remarks: string | null } | null;
  fellowship: { id: string; fellowshipId: string; sanctionedAmount: number; awardLetterPath?: string | null } | null;
};

export function TrusteeApprovalsClient() {
  const [applications, setApplications] = useState<TrusteeApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setError("");
    fetch("/api/trustee/approvals")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || "Unable to load trustee applications");
          setApplications([]);
          return;
        }
        setApplications(d.applications || []);
      })
      .catch(() => {
        setError("Unable to load trustee applications. Please refresh.");
        setApplications([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading) {
    return <p className="py-12 text-center text-gray-500">Loading applications...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trustee Approvals</h1>
        <p className="mt-1 text-gray-600">
          Review applications assigned to you — approve fellowship awards or raise queries
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {applications.length === 0 && !error && (
        <div className="card py-8 text-center text-gray-500">
          No applications assigned yet. Admin will assign applications for trustee review.
        </div>
      )}

      {applications.map((app) => {
        const avgScore =
          app.committeeScores.length > 0
            ? app.committeeScores.reduce((s, c) => s + c.totalScore, 0) /
              app.committeeScores.length
            : 0;

        return (
          <div key={app.id} className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-mono text-lg font-semibold tracking-wide">
                  {formatApplicationNumber(app.applicationNumber)}
                </h2>
                <p className="text-gray-600">
                  {app.user.profile?.name} — {app.researchProposal?.projectTitle}
                </p>
              </div>
              <StatusBadge status={app.status} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Committee Score</p>
                <p className="text-2xl font-bold text-primary-600">{avgScore.toFixed(1)}/100</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Budget Requested</p>
                <p className="text-2xl font-bold">
                  {app.budget ? formatCurrency(app.budget.total) : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Reviews</p>
                <p className="text-2xl font-bold">{app.committeeScores.length}</p>
              </div>
            </div>

            {app.committeeRemarks.length > 0 && (
              <div>
                <h3 className="mb-2 font-medium">Committee Remarks</h3>
                {app.committeeRemarks.map((r, i) => (
                  <div key={i} className="mb-2 rounded-lg border p-3 text-sm">
                    <p className="font-medium">{r.committeeUser.profile?.name}</p>
                    <p className="text-gray-600">{r.remark}</p>
                  </div>
                ))}
              </div>
            )}

            {app.trusteeApproval ? (
              <div
                className={`rounded-lg p-4 ${
                  app.trusteeApproval.approved ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <p className="font-medium">
                  {app.trusteeApproval.approved ? "Approved" : "Rejected"} by Trustee
                </p>
                {app.trusteeApproval.remarks && (
                  <p className="mt-1 text-sm text-gray-600">{app.trusteeApproval.remarks}</p>
                )}
                {app.fellowship && (
                  <>
                    <p className="mt-2 text-sm font-medium text-green-800">
                      Fellowship {formatApplicationNumber(app.fellowship.fellowshipId)} —{" "}
                      {formatCurrency(app.fellowship.sanctionedAmount)}
                    </p>
                    {app.fellowship.awardLetterPath && (
                      <a
                        href={app.fellowship.awardLetterPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm text-primary-600 hover:underline"
                      >
                        View auto-generated Fellowship Agreement
                      </a>
                    )}
                  </>
                )}
              </div>
            ) : ["SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED", "TRUSTEE_REVIEW", "WAITLISTED", "QUERY_RESPONDED"].includes(app.status) ? (
              <>
                <TrusteeApprovalActions
                  applicationId={app.id}
                  budgetTotal={app.budget?.total}
                  onComplete={reload}
                />
                <ApplicationQueryPanel
                  applicationId={app.id}
                  phase="TRUSTEE"
                  canResolve
                  onUpdated={reload}
                />
              </>
            ) : app.status === "QUERY_RAISED" ? (
              <ApplicationQueryPanel applicationId={app.id} phase="TRUSTEE" canRaise={false} />
            ) : null}
          </div>
        );
      })}

    </div>
  );
}
