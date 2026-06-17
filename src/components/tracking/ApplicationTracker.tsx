"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  FileCheck2,
  Loader2,
  Radio,
  RefreshCw,
  Upload,
  XCircle,
  AlertCircle,
  Sparkles,
  Users,
  Mic,
  Trophy,
  Send,
  ShieldCheck,
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
  adminNotes: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="card py-16 text-center">
        <FileCheck2 className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-4 text-gray-600">No applications found. Start from the Forms section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="tracker-live-dot inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          Live tracking
          {lastUpdated && (
            <span className="text-gray-400">
              · Updated {new Date(lastUpdated).toLocaleTimeString("en-IN")}
            </span>
          )}
        </div>
        <Button
          variant="secondary"
          className="text-xs"
          loading={refreshing}
          onClick={() => load()}
        >
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          Refresh now
        </Button>
      </div>

      {message && (
        <div className="rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-800">{message}</div>
      )}

      {applications.map((app, appIndex) => {
        const isRejected = app.status === "REJECTED";
        const currentIndex = app.pipelineIndex;

        return (
          <div
            key={app.id}
            className="tracker-slide-up overflow-hidden rounded-3xl border border-[#e4ede8] bg-white shadow-[0_20px_60px_rgba(27,107,82,0.08)]"
            style={{ animationDelay: `${appIndex * 80}ms` }}
          >
            <div className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-[#2d9b72] px-6 py-8 text-white sm:px-8">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                    Application Tracking Number
                  </p>
                  <p className="mt-2 font-mono text-3xl font-bold tracking-widest sm:text-4xl">
                    {app.applicationNumber}
                  </p>
                  <p className="mt-1 text-sm text-white/80">{app.formattedNumber}</p>
                  <p className="mt-3 text-sm text-white/70">
                    Applied {formatDate(app.createdAt)}
                    {app.submittedAt && ` · Submitted ${formatDate(app.submittedAt)}`}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={app.status} />
                  <p className="mt-3 text-3xl font-bold">{app.progress}%</p>
                  <p className="text-xs text-white/70">Journey complete</p>
                </div>
              </div>

              <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="tracker-progress-fill h-full rounded-full bg-gradient-to-r from-gold to-lime-pop"
                  style={{ width: `${app.progress}%` }}
                />
              </div>
            </div>

            <div className="px-6 py-8 sm:px-8">
              {isRejected && app.rejectionReason && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">Application not proceeding</p>
                    <p className="mt-1 text-sm text-red-700">{app.rejectionReason}</p>
                  </div>
                </div>
              )}

              <h3 className="mb-5 font-display text-lg font-bold text-gray-900">
                Application Journey
              </h3>

              <div className="relative">
                <div className="absolute left-5 top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary-200 via-primary-400 to-primary-100" />
                <div className="space-y-4">
                  {pipeline.map((stage, index) => {
                    const Icon = STAGE_ICONS[index] ?? Circle;
                    const isComplete = !isRejected && currentIndex > index;
                    const isCurrent = !isRejected && currentIndex === index;
                    const isUpcoming = !isRejected && currentIndex < index;

                    return (
                      <div
                        key={stage.key}
                        className={`relative flex items-start gap-4 rounded-2xl p-4 transition ${
                          isCurrent
                            ? "border border-primary-200 bg-primary-50/80 shadow-sm"
                            : isComplete
                              ? "bg-gray-50/50"
                              : "opacity-60"
                        }`}
                      >
                        <div
                          className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            isComplete
                              ? "bg-primary-600 text-white"
                              : isCurrent
                                ? "bg-gold text-white tracker-pulse"
                                : "border-2 border-gray-200 bg-white text-gray-400"
                          }`}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : isCurrent ? (
                            <Icon className="h-5 w-5" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900">{stage.label}</p>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-medium text-amber-900">
                                <Radio className="h-3 w-3" />
                                In progress
                              </span>
                            )}
                            {isComplete && (
                              <span className="text-xs font-medium text-primary-700">Completed</span>
                            )}
                            {isUpcoming && (
                              <span className="text-xs text-gray-400">Upcoming</span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{stage.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {app.documents.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-gray-900">
                    <FileCheck2 className="h-5 w-5 text-primary-600" />
                    Document Verification
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {app.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className={`rounded-2xl border p-4 transition ${
                          doc.status === "RESUBMIT_REQUIRED"
                            ? "border-orange-300 bg-orange-50"
                            : doc.status === "APPROVED"
                              ? "border-green-200 bg-green-50/50"
                              : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.label}</p>
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
                          <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/80 p-2 text-xs text-orange-800">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{doc.rejectionReason}</span>
                          </div>
                        )}

                        {doc.canResubmit && (
                          <div className="mt-3">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-primary-700 ring-1 ring-primary-200 hover:bg-primary-50">
                              <Upload className="h-3.5 w-3.5" />
                              {uploadingDoc === doc.type ? "Uploading..." : "Resubmit document"}
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
                            <p className="mt-1 text-[11px] text-gray-500">
                              Same application ID — no need to re-apply
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8">
                <h3 className="mb-4 font-display text-lg font-bold text-gray-900">
                  Activity Timeline
                </h3>
                <div className="space-y-0">
                  {app.statusHistory.map((entry, i) => (
                    <div
                      key={entry.id}
                      className="tracker-slide-up flex gap-4 border-l-2 border-primary-200 py-3 pl-5"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {entry.fromStatus
                            ? `${formatHistoryStatus(entry.fromStatus)} → ${formatHistoryStatus(entry.toStatus)}`
                            : formatHistoryStatus(entry.toStatus)}
                        </p>
                        {entry.notes && (
                          <p className="mt-0.5 text-sm text-gray-600">{entry.notes}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">{formatDate(entry.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {app.interview && (
                <div className="mt-6 rounded-2xl bg-indigo-50 p-5">
                  <h3 className="font-semibold text-indigo-900">Interview Scheduled</h3>
                  <p className="mt-2 text-sm text-indigo-800">
                    {formatDate(app.interview.scheduledDate)} at {app.interview.scheduledTime}
                  </p>
                  <p className="mt-1 text-sm text-indigo-700">Panel: {app.interview.panelMembers}</p>
                  <a
                    href={app.interview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
                  >
                    Join meeting
                  </a>
                </div>
              )}

              {app.fellowship && (
                <div className="mt-6 rounded-2xl bg-green-50 p-5">
                  <h3 className="font-semibold text-green-900">Fellowship Awarded</h3>
                  <p className="mt-2 text-sm text-green-800">
                    Fellowship ID: {app.fellowship.fellowshipId}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
