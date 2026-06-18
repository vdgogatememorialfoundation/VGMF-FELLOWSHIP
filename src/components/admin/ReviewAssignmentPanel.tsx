"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

type Reviewer = { id: string; name: string; email: string; role: string };

type Assignment = {
  id: string;
  phase: string;
  notes: string | null;
  assignedAt: string;
  reviewer: { id: string; profile: { name: string } | null; email: string };
};

export function ReviewAssignmentPanel({
  applicationId,
  onUpdated,
}: {
  applicationId: string;
  onUpdated?: () => void;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [committeeReviewers, setCommitteeReviewers] = useState<Reviewer[]>([]);
  const [trusteeReviewers, setTrusteeReviewers] = useState<Reviewer[]>([]);
  const [committeeReviewerId, setCommitteeReviewerId] = useState("");
  const [trusteeReviewerId, setTrusteeReviewerId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [aRes, cRes, tRes] = await Promise.all([
      fetch(`/api/admin/review-assignments?applicationId=${applicationId}`),
      fetch("/api/admin/reviewers?phase=COMMITTEE"),
      fetch("/api/admin/reviewers?phase=TRUSTEE"),
    ]);
    const aData = await aRes.json();
    const cData = await cRes.json();
    const tData = await tRes.json();
    setAssignments(aData.assignments || []);
    setCommitteeReviewers(cData.reviewers || []);
    setTrusteeReviewers(tData.reviewers || []);
  }

  useEffect(() => {
    load();
  }, [applicationId]);

  async function assign(phase: "COMMITTEE" | "TRUSTEE", reviewerId: string) {
    if (!reviewerId) return;
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/admin/review-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, reviewerId, phase, notes }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to assign reviewer");
      return;
    }

    setMessage(`${phase === "COMMITTEE" ? "Committee" : "Trustee"} reviewer assigned`);
    setNotes("");
    if (phase === "COMMITTEE") setCommitteeReviewerId("");
    else setTrusteeReviewerId("");
    await load();
    onUpdated?.();
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-semibold">Assign Reviewers</h2>
        <p className="mt-1 text-sm text-gray-600">
          Assigned committee and trustee members will see this application in their review portal.
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      <Textarea
        label="Assignment notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Research Committee</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={committeeReviewerId}
            onChange={(e) => setCommitteeReviewerId(e.target.value)}
          >
            <option value="">Select committee member…</option>
            {committeeReviewers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.email})
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            loading={loading}
            disabled={!committeeReviewerId}
            onClick={() => assign("COMMITTEE", committeeReviewerId)}
          >
            Assign to Committee
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Board of Trustees</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={trusteeReviewerId}
            onChange={(e) => setTrusteeReviewerId(e.target.value)}
          >
            <option value="">Select trustee…</option>
            {trusteeReviewers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.email})
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            loading={loading}
            disabled={!trusteeReviewerId}
            onClick={() => assign("TRUSTEE", trusteeReviewerId)}
          >
            Assign to Trustee
          </Button>
        </div>
      </div>

      {assignments.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-medium">Current assignments</h3>
          {assignments.map((a) => (
            <div key={a.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {a.phase.replace(/_/g, " ")} — {a.reviewer.profile?.name ?? a.reviewer.email}
              </p>
              {a.notes && <p className="text-gray-600">{a.notes}</p>}
              <p className="text-xs text-gray-400">
                Assigned {new Date(a.assignedAt).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
