import prisma from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function TrusteeDashboard() {
  const applications = await prisma.application.findMany({
    where: { status: { in: ["SHORTLISTED", "SELECTED"] } },
    include: {
      user: { include: { profile: true } },
      researchProposal: true,
      committeeScores: true,
      committeeRemarks: { include: { committeeUser: { include: { profile: true } } } },
      trusteeApproval: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trustee Approval</h1>
        <p className="mt-1 text-gray-600">Review scores, committee remarks, and approve fellowships</p>
      </div>

      {applications.map((app) => {
        const avgScore =
          app.committeeScores.length > 0
            ? app.committeeScores.reduce((s, c) => s + c.totalScore, 0) / app.committeeScores.length
            : 0;

        return (
          <div key={app.id} className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{app.applicationNumber}</h2>
                <p className="text-gray-600">{app.user.profile?.name} — {app.researchProposal?.projectTitle}</p>
              </div>
              <StatusBadge status={app.status} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Average Committee Score</p>
                <p className="text-2xl font-bold text-primary-600">{avgScore.toFixed(1)}/100</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Committee Reviews</p>
                <p className="text-2xl font-bold">{app.committeeScores.length}</p>
              </div>
            </div>

            {app.committeeRemarks.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Committee Remarks</h3>
                {app.committeeRemarks.map((r) => (
                  <div key={r.id} className="rounded-lg border p-3 mb-2 text-sm">
                    <p className="font-medium">{r.committeeUser.profile?.name}</p>
                    <p className="text-gray-600">{r.remark}</p>
                  </div>
                ))}
              </div>
            )}

            {app.trusteeApproval ? (
              <div className={`rounded-lg p-4 ${app.trusteeApproval.approved ? "bg-green-50" : "bg-red-50"}`}>
                <p className="font-medium">
                  {app.trusteeApproval.approved ? "Approved" : "Rejected"} by Trustee
                </p>
                {app.trusteeApproval.remarks && (
                  <p className="mt-1 text-sm text-gray-600">{app.trusteeApproval.remarks}</p>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <button className="btn-primary">Approve Fellowship</button>
                <button className="btn-danger">Reject Fellowship</button>
              </div>
            )}
          </div>
        );
      })}

      {applications.length === 0 && (
        <div className="card text-center py-12 text-gray-500">
          No applications pending trustee approval
        </div>
      )}
    </div>
  );
}
