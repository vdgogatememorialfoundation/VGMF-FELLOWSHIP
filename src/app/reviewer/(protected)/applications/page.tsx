"use client";

import { useState, useEffect } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function ReviewerApplicationsPage() {
  const [applications, setApplications] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    fetch("/api/committee/scores")
      .then((r) => r.json())
      .then((d) => setApplications(d.applications || []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Applications for Review</h1>
        <p className="mt-1 text-gray-600">Proposals awaiting committee evaluation</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4">Application #</th>
              <th className="pb-3 pr-4">Applicant</th>
              <th className="pb-3 pr-4">Project</th>
              <th className="pb-3 pr-4">Area</th>
              <th className="pb-3 pr-4">Avg Score</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => {
              const a = app as {
                id: string;
                applicationNumber: string;
                status: string;
                averageScore: number;
                user: { profile: { name: string } | null };
                researchProposal: {
                  projectTitle: string;
                  researchArea: string;
                } | null;
              };
              return (
                <tr key={a.id} className="border-b">
                  <td className="py-3 pr-4 font-medium">{a.applicationNumber}</td>
                  <td className="py-3 pr-4">{a.user.profile?.name}</td>
                  <td className="py-3 pr-4">{a.researchProposal?.projectTitle ?? "—"}</td>
                  <td className="py-3 pr-4">
                    {a.researchProposal?.researchArea?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    {a.averageScore > 0 ? `${a.averageScore.toFixed(1)}/100` : "—"}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
