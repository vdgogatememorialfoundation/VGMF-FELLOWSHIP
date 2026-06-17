"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  FileCheck2,
  Loader2,
  RefreshCw,
  Upload,
  AlertCircle,
  Sparkles,
  Users,
  Mic,
  Trophy,
  Send,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DocStatusBadge } from "@/components/ui/DocStatusBadge";
import { Button } from "@/components/ui/Button";
import { formatDate, getStatusLabel } from "@/lib/utils";

type TrackingStage = {
  key: string;
  label: string;
  description: string;
  statuses: string[];
};

type TrackingDocument = {
  id: string;
  type: string;
  label: string;
  status: string;
  fileName: string;
  filePath: string;
  rejectionReason?: string | null;
  canResubmit: boolean;
};

type StatusHistoryEntry = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  notes: string | null;
  createdAt: string;
};

type TrackedApplication = {
  id: string;
  applicationNumber: string;
  formattedNumber: string;
  status: string;
  progress: number;
  pipelineIndex: number;
  rejectionReason: string | null;
  submittedAt: string | null;
  createdAt: string;
  documents: TrackingDocument[];
  statusHistory: StatusHistoryEntry[];
  interview: {
    scheduledDate: string;
    scheduledTime: string;
    meetingLink: string;
    panelMembers: string;
  } | null;
  fellowship: { fellowshipId: string; isActive: boolean; isCompleted: boolean } | null;
};

const STAGE_ICONS = [Send, ShieldCheck, FileCheck2, Users, Sparkles, Mic, Trophy];
const POLL_INTERVAL_MS = 12000;

function formatHistoryStatus(status: string) {
  return getStatusLabel(status);
}

export function ApplicationTracker() {
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [pipeline, setPipeline] = useState<TrackingStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch("/api/applications/tracking", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setApplications(data.applications || []);
        setPipeline(data.pipeline || []);
        setLastUpdated(data.updatedAt || new Date().toISOString());
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function resubmitDocument(applicationId: string, docType: string, file: File) {
    setUploadingDoc(docType);
    setMessage("");
    const formData = new FormData();
    formData.append("applicationId", applicationId);
    formData.append("type", docType);
    formData.append("file", file);

    const res = await fetch("/api/documents", { method: "POST", body: formData });
    const data = await res.json();
    setUploadingDoc(null);

    if (!res.ok) {
      setMessage(data.error || "Upload failed");
      return;
    }

    setMessage(`${file.name} resubmitted successfully. Status will update after admin review.`);
    await load(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-[#e8f0ec] bg-white">
        <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#dce8e2] bg-[#fafdfb] py-16 text-center">
        <FileCheck2 className="mx-auto h-10 w-10 text-primary-300" />
        <p className="mt-4 text-ink-soft">No applications found. Start from the Forms section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8f0ec] bg-[#fafdfb] px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <span className="tracker-live-dot inline-flex h-2 w-2 rounded-full bg-primary-400" />
          <span className="font-medium text-primary-700">Live updates</span>
          {lastUpdated && (
            <span className="text-muted">
              · {new Date(lastUpdated).toLocaleTimeString("en-IN")}
            </span>
          )}
        </div>
        <Button variant="secondary" className="text-xs" loading={refreshing} onClick={() => load()}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {message && (
        <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-800">
          {message}
        </div>
      )}

      {applications.map((app, appIndex) => {
        const isRejected = app.status === "REJECTED";
        const currentIndex = app.pipelineIndex;

        return (
          <article
            key={app.id}
            className="tracker-slide-up overflow-hidden rounded-3xl border border-[#e8f0ec] bg-white shadow-[0_8px_32px_rgba(27,107,82,0.06)]"
            style={{ animationDelay: `${appIndex * 60}ms` }}
          >
            {/* Light header */}
            <div className="border-b border-[#eef4f0] bg-gradient-to-r from-[#fffdf8] via-white to-[#f4faf7] px-5 py-6 sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                    12-digit tracking number
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-primary-700 sm:text-3xl">
                    {app.applicationNumber}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{app.formattedNumber}</p>
                  <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>Applied {formatDate(app.createdAt)}</span>
                    {app.submittedAt && <span>Submitted {formatDate(app.submittedAt)}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary-100 bg-white"
                    aria-hidden
                  >
                    <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#e8f0ec" strokeWidth="6" />
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        fill="none"
                        stroke="#3fbf88"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${(app.progress / 100) * 213.6} 213.6`}
                        className="tracker-progress-fill transition-all duration-700"
                      />
                    </svg>
                    <span className="text-lg font-bold text-primary-700">{app.progress}%</span>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={app.status} />
                    <p className="mt-2 text-xs text-muted">Overall progress</p>
                  </div>
                </div>
              </div>

              {/* Horizontal stepper — light */}
              <div className="mt-6 overflow-x-auto pb-1">
                <div className="flex min-w-max items-center gap-1">
                  {pipeline.map((stage, index) => {
                    const Icon = STAGE_ICONS[index] ?? Circle;
                    const isComplete = !isRejected && currentIndex > index;
                    const isCurrent = !isRejected && currentIndex === index;

                    return (
                      <div key={stage.key} className="flex items-center">
                        <div
                          className={`flex items-center gap-2 rounded-2xl px-3 py-2 transition ${
                            isCurrent
                              ? "border border-gold/40 bg-gold-soft shadow-sm"
                              : isComplete
                                ? "bg-primary-50"
                                : "bg-[#f8faf9] opacity-70"
                          }`}
                          title={stage.description}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              isComplete
                                ? "bg-primary-100 text-primary-600"
                                : isCurrent
                                  ? "bg-white text-gold shadow-sm tracker-pulse"
                                  : "bg-white text-gray-300"
                            }`}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Icon className="h-4 w-4" />
                            )}
                          </div>
                          <span
                            className={`max-w-[88px] text-[11px] font-semibold leading-tight ${
                              isCurrent ? "text-ink" : isComplete ? "text-primary-700" : "text-muted"
                            }`}
                          >
                            {stage.label}
                          </span>
                        </div>
                        {index < pipeline.length - 1 && (
                          <div
                            className={`mx-0.5 h-0.5 w-4 sm:w-6 ${
                              isComplete ? "bg-primary-200" : "bg-[#e8f0ec]"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-6 px-5 py-6 sm:px-8">
              {isRejected && app.rejectionReason && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/80 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <div>
                    <p className="font-medium text-red-800">Application not proceeding</p>
                    <p className="mt-1 text-sm text-red-600">{app.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Current stage highlight */}
              {!isRejected && pipeline[currentIndex] && (
                <div className="rounded-2xl border border-primary-100 bg-[#f6fbf8] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                    Current stage
                  </p>
                  <p className="mt-1 font-display text-lg font-bold text-ink">
                    {pipeline[currentIndex].label}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">{pipeline[currentIndex].description}</p>
                </div>
              )}

              {app.documents.length > 0 && (
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
                    <FileCheck2 className="h-4 w-4 text-primary-500" />
                    Document verification
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {app.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className={`rounded-2xl border p-4 ${
                          doc.status === "RESUBMIT_REQUIRED"
                            ? "border-amber-200 bg-amber-50/60"
                            : doc.status === "APPROVED"
                              ? "border-emerald-100 bg-emerald-50/40"
                              : "border-[#e8f0ec] bg-[#fafdfb]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-ink">{doc.label}</p>
                            <a
                              href={doc.filePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block text-xs text-primary-600 hover:underline"
                            >
                              {doc.fileName}
                            </a>
                          </div>
                          <DocStatusBadge status={doc.status} />
                        </div>

                        {doc.rejectionReason && (
                          <p className="mt-2 rounded-lg bg-white/70 px-2 py-1.5 text-xs text-amber-800">
                            {doc.rejectionReason}
                          </p>
                        )}

                        {doc.canResubmit && (
                          <div className="mt-3">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary-200 bg-white px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-50">
                              <Upload className="h-3.5 w-3.5" />
                              {uploadingDoc === doc.type ? "Uploading…" : "Resubmit (same ID)"}
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                                disabled={uploadingDoc === doc.type}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void resubmitDocument(app.id, doc.type, file);
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
                  <Clock3 className="h-4 w-4 text-primary-500" />
                  Activity log
                </h3>
                <div className="space-y-2">
                  {app.statusHistory.map((entry, i) => (
                    <div
                      key={entry.id}
                      className="tracker-slide-up flex gap-3 rounded-xl border border-[#eef4f0] bg-[#fafdfb] px-4 py-3"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-300" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">
                          {entry.fromStatus
                            ? `${formatHistoryStatus(entry.fromStatus)} → ${formatHistoryStatus(entry.toStatus)}`
                            : formatHistoryStatus(entry.toStatus)}
                        </p>
                        {entry.notes && (
                          <p className="mt-0.5 text-sm text-ink-soft">{entry.notes}</p>
                        )}
                        <p className="mt-1 text-xs text-muted">{formatDate(entry.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {app.interview && (
                <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                  <h3 className="font-semibold text-violet-800">Interview scheduled</h3>
                  <p className="mt-1 text-sm text-violet-700">
                    {formatDate(app.interview.scheduledDate)} at {app.interview.scheduledTime}
                  </p>
                  <p className="text-sm text-violet-600">Panel: {app.interview.panelMembers}</p>
                  <a
                    href={app.interview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline"
                  >
                    Join meeting
                  </a>
                </div>
              )}

              {app.fellowship && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <h3 className="font-semibold text-emerald-800">Fellowship awarded</h3>
                  <p className="mt-1 text-sm text-emerald-700">
                    Fellowship ID: {app.fellowship.fellowshipId}
                  </p>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
