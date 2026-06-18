"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

type QueryRecord = {
  id: string;
  phase: string;
  message: string;
  requiresFullResubmit: boolean;
  status: string;
  applicantResponse: string | null;
  createdAt: string;
  raisedByUser: { profile: { name: string } | null };
};

export function ApplicationQueryPanel({
  applicationId,
  phase,
  canRaise = true,
  canResolve = false,
  onUpdated,
}: {
  applicationId: string;
  phase: "COMMITTEE" | "TRUSTEE" | "VERIFICATION";
  canRaise?: boolean;
  canResolve?: boolean;
  onUpdated?: () => void;
}) {
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [message, setMessage] = useState("");
  const [requiresFullResubmit, setRequiresFullResubmit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const res = await fetch(`/api/reviews/queries?applicationId=${applicationId}`);
    const data = await res.json();
    setQueries(data.queries || []);
  }

  useEffect(() => {
    load();
  }, [applicationId]);

  async function raiseQuery() {
    if (!message.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/reviews/queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "raise",
        applicationId,
        phase,
        message,
        requiresFullResubmit,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to raise query");
      return;
    }

    setSuccess("Query raised — applicant has been notified");
    setMessage("");
    setRequiresFullResubmit(false);
    await load();
    onUpdated?.();
  }

  async function resolveQuery(queryId: string) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/reviews/queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", queryId }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to resolve query");
      return;
    }

    setSuccess("Query resolved — review resumed");
    await load();
    onUpdated?.();
  }

  const openQueries = queries.filter((q) => q.status === "OPEN" || q.status === "RESPONDED");

  return (
    <div className="space-y-4">
      {canRaise && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
          <h3 className="font-medium text-orange-900">Raise Query on Application</h3>
          <Textarea
            label="Query message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe what needs clarification or correction…"
          />
          <label className="flex items-center gap-2 text-sm text-orange-900">
            <input
              type="checkbox"
              checked={requiresFullResubmit}
              onChange={(e) => setRequiresFullResubmit(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Require applicant to resubmit all application details
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}
          <Button loading={loading} onClick={raiseQuery}>
            Send Query to Applicant
          </Button>
        </div>
      )}

      {openQueries.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Query history</h3>
          {openQueries.map((q) => (
            <div key={q.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">
                [{q.phase}] {q.status.replace(/_/g, " ")}
                {q.requiresFullResubmit && (
                  <span className="ml-2 rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
                    Full resubmit required
                  </span>
                )}
              </p>
              <p className="mt-1 text-gray-700">{q.message}</p>
              {q.applicantResponse && (
                <p className="mt-2 rounded bg-gray-50 p-2 text-gray-600">
                  <strong>Applicant:</strong> {q.applicantResponse}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Raised by {q.raisedByUser.profile?.name ?? "Reviewer"} —{" "}
                {new Date(q.createdAt).toLocaleString("en-IN")}
              </p>
              {canResolve && q.status === "RESPONDED" && (
                <Button
                  variant="secondary"
                  className="mt-2 text-xs"
                  loading={loading}
                  onClick={() => resolveQuery(q.id)}
                >
                  Mark resolved & resume review
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
