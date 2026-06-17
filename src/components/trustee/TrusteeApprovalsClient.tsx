"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TrusteeApprovalActions } from "@/components/trustee/TrusteeApprovalActions";
import { formatCurrency } from "@/lib/utils";

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
  fellowship: { fellowshipId: string; sanctionedAmount: number } | null;
};

export function TrusteeApprovalsClient() {
  const [applications, setApplications] = useState<TrusteeApp[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    fetch("/api/trustee/approvals")
      .then((r) => r.json())
      .then((d) => {
        setApplications(d.applications || []);
        setLoading(false);
      });
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
          Final fellowship approval by the Board of Trustees (Rulebook §7.4)
        </p>
      </div>

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
                <h2 className="text-lg font-semibold">{app.applicationNumber}</h2>
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
                  <p className="mt-2 text-sm font-medium text-green-800">
                    Fellowship {app.fellowship.fellowshipId} —{" "}
                    {formatCurrency(app.fellowship.sanctionedAmount)}
                  </p>
                )}
              </div>
            ) : ["SHORTLISTED", "INTERVIEW_SCHEDULED", "WAITLISTED"].includes(app.status) ? (
              <TrusteeApprovalActions
                applicationId={app.id}
                budgetTotal={app.budget?.total}
                onComplete={reload}
              />
            ) : null}
          </div>
        );
      })}

      {applications.length === 0 && (
        <div className="card py-12 text-center text-gray-500">
          No applications pending trustee approval
        </div>
      )}
    </div>
  );
}
