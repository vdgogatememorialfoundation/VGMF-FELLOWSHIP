"use client";

import { useState, useEffect } from "react";
import { SCORING_CRITERIA } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function CommitteeDashboard() {
  const [applications, setApplications] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({
    scientificMerit: 0, innovation: 0, feasibility: 0,
    budgetJustification: 0, viddhakarmaRelevance: 0,
  });
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    fetch("/api/committee/scores").then((r) => r.json()).then((d) => setApplications(d.applications || []));
  }, []);

  async function submitScore(applicationId: string) {
    await fetch("/api/committee/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, ...scores, remarks, isShortlisted: false }),
    });
    setSelected(null);
    fetch("/api/committee/scores").then((r) => r.json()).then((d) => setApplications(d.applications || []));
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Committee Portal</h1>
        <p className="mt-1 text-gray-600">Review applications, score proposals, and shortlist candidates</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4">Application #</th>
              <th className="pb-3 pr-4">Applicant</th>
              <th className="pb-3 pr-4">Project</th>
              <th className="pb-3 pr-4">Avg Score</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => {
              const a = app as {
                id: string; applicationNumber: string; status: string;
                averageScore: number;
                user: { profile: { name: string } | null };
                researchProposal: { projectTitle: string } | null;
              };
              return (
                <tr key={a.id} className="border-b">
                  <td className="py-3 pr-4 font-medium">{a.applicationNumber}</td>
                  <td className="py-3 pr-4">{a.user.profile?.name}</td>
                  <td className="py-3 pr-4">{a.researchProposal?.projectTitle ?? "—"}</td>
                  <td className="py-3 pr-4 font-medium">{a.averageScore.toFixed(1)}/100</td>
                  <td className="py-3 pr-4"><StatusBadge status={a.status} /></td>
                  <td className="py-3">
                    <Button variant="secondary" className="text-xs" onClick={() => setSelected(a.id)}>Score</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="card space-y-4">
          <h2 className="font-semibold">Score Application</h2>
          {SCORING_CRITERIA.map((c) => (
            <Input
              key={c.key}
              label={`${c.label} (max ${c.maxMarks})`}
              type="number"
              min={0}
              max={c.maxMarks}
              value={scores[c.key]}
              onChange={(e) => setScores({ ...scores, [c.key]: Number(e.target.value) })}
            />
          ))}
          <p className="font-medium">Total: {totalScore}/100</p>
          <Textarea label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={() => submitScore(selected)}>Submit Score</Button>
            <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
