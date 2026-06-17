import { requireAuth } from "@/components/layout/PortalLayout";
import prisma from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DocStatusBadge } from "@/components/ui/DocStatusBadge";
import { formatDate } from "@/lib/utils";

export default async function ApplicantStatusPage() {
  const user = await requireAuth(["APPLICANT"]);

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: {
      statusHistory: { orderBy: { createdAt: "desc" } },
      documents: true,
      interview: true,
      fellowship: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applicant State</h1>
          <p className="mt-1 text-gray-600">Track your application progress through each stage</p>
        </div>

        {applications.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">No applications found. Start your application from the Forms section.</p>
          </div>
        ) : (
          applications.map((app) => (
            <div key={app.id} className="card space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{app.applicationNumber}</h2>
                  <p className="text-sm text-gray-500">Applied: {formatDate(app.createdAt)}</p>
                </div>
                <StatusBadge status={app.status} />
              </div>

              {app.rejectionReason && (
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                  <p className="mt-1 text-sm text-red-700">{app.rejectionReason}</p>
                </div>
              )}

              <div>
                <h3 className="font-medium mb-3">Status Timeline</h3>
                <div className="space-y-3">
                  {app.statusHistory.map((h) => (
                    <div key={h.id} className="flex items-start gap-3">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-primary-600" />
                      <div>
                        <p className="text-sm font-medium">
                          {h.fromStatus ? `${h.fromStatus.replace(/_/g, " ")} → ` : ""}
                          {h.toStatus.replace(/_/g, " ")}
                        </p>
                        {h.notes && <p className="text-sm text-gray-600">{h.notes}</p>}
                        <p className="text-xs text-gray-400">{formatDate(h.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {app.documents.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Documents</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {app.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm">{doc.type.replace(/_/g, " ")}</span>
                        <DocStatusBadge status={doc.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {app.interview && (
                <div className="rounded-lg bg-indigo-50 p-4">
                  <h3 className="font-medium text-indigo-900">Interview Scheduled</h3>
                  <p className="mt-2 text-sm text-indigo-700">
                    Date: {formatDate(app.interview.scheduledDate)} at {app.interview.scheduledTime}
                  </p>
                  <a href={app.interview.meetingLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline">
                    Join Meeting
                  </a>
                </div>
              )}

              {app.fellowship && (
                <div className="rounded-lg bg-green-50 p-4">
                  <h3 className="font-medium text-green-900">Fellowship Awarded</h3>
                  <p className="mt-2 text-sm text-green-700">
                    Fellowship ID: {app.fellowship.fellowshipId}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
  );
}
