"use client";

import { useState, useEffect } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function ReviewerRankingsPage() {
  const [applications, setApplications] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    fetch("/api/committee/scores")
      .then((r) => r.json())
      .then((d) => setApplications(d.applications || []));
  }, []);

  const ranked = [...applications].sort(
    (a, b) =>
      ((b as { averageScore: number }).averageScore ?? 0) -
      ((a as { averageScore: number }).averageScore ?? 0)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rankings</h1>
        <p className="mt-1 text-gray-600">Applications ranked by average committee score</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4">Rank</th>
              <th className="pb-3 pr-4">Application #</th>
              <th className="pb-3 pr-4">Applicant</th>
              <th className="pb-3 pr-4">Project</th>
              <th className="pb-3 pr-4">Reviews</th>
              <th className="pb-3 pr-4">Avg Score</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((app, index) => {
              const a = app as {
                id: string;
                applicationNumber: string;
                status: string;
                averageScore: number;
                committeeScores: unknown[];
                user: { profile: { name: string } | null };
                researchProposal: { projectTitle: string } | null;
              };
              return (
                <tr key={a.id} className="border-b">
                  <td className="py-3 pr-4 font-bold text-primary-600">#{index + 1}</td>
                  <td className="py-3 pr-4 font-medium">{a.applicationNumber}</td>
                  <td className="py-3 pr-4">{a.user.profile?.name}</td>
                  <td className="py-3 pr-4">{a.researchProposal?.projectTitle ?? "—"}</td>
                  <td className="py-3 pr-4">{a.committeeScores?.length ?? 0}</td>
                  <td className="py-3 pr-4 text-lg font-bold">
                    {a.averageScore > 0 ? a.averageScore.toFixed(1) : "—"}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              );
            })}
            {ranked.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
                  No scored applications yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
