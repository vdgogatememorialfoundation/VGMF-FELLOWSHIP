"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

type InterviewSchedulePanelProps = {
  applicationId: string;
  existing?: {
    scheduledDate: string;
    scheduledTime: string;
    meetingLink: string;
    panelMembers: string;
    notes?: string | null;
  } | null;
  onScheduled: () => void;
};

export function InterviewSchedulePanel({
  applicationId,
  existing,
  onScheduled,
}: InterviewSchedulePanelProps) {
  const [scheduledDate, setScheduledDate] = useState(
    existing?.scheduledDate ? existing.scheduledDate.slice(0, 10) : ""
  );
  const [scheduledTime, setScheduledTime] = useState(existing?.scheduledTime ?? "");
  const [meetingLink, setMeetingLink] = useState(existing?.meetingLink ?? "");
  const [panelMembers, setPanelMembers] = useState(existing?.panelMembers ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function schedule() {
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/admin/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId,
        scheduledDate,
        scheduledTime,
        meetingLink,
        panelMembers,
        notes,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to schedule interview");
      return;
    }

    setMessage("Interview scheduled successfully");
    onScheduled();
  }

  return (
    <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
      <h3 className="font-semibold text-indigo-900">Interview Scheduling</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Interview date"
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          required
        />
        <Input
          label="Interview time"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          placeholder="e.g. 10:00 AM IST"
          required
        />
        <Input
          label="Meeting link"
          value={meetingLink}
          onChange={(e) => setMeetingLink(e.target.value)}
          placeholder="Zoom / Google Meet link"
          className="sm:col-span-2"
        />
        <Textarea
          label="Panel members"
          value={panelMembers}
          onChange={(e) => setPanelMembers(e.target.value)}
          placeholder="Names of interview panel members"
          className="sm:col-span-2"
        />
        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="sm:col-span-2"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}
      <Button loading={loading} onClick={schedule}>
        {existing ? "Update Interview" : "Schedule Interview"}
      </Button>
    </div>
  );
}
