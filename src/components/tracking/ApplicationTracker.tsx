"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Upload,
  AlertCircle,
  Radio,
} from "lucide-react";
import { DocStatusBadge } from "@/components/ui/DocStatusBadge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { TrackingHeadline, TrackingTimelineStep } from "@/lib/tracking-timeline";
import { FlipkartProgressRail } from "@/components/tracking/FlipkartProgressRail";
import { FlipkartTrackingTimeline } from "@/components/tracking/FlipkartTrackingTimeline";

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
  displayStatus?: string;
  progress: number;
  headline?: TrackingHeadline;
  timeline?: TrackingTimelineStep[];
  compactSteps?: Array<{ key: string; label: string; state: "complete" | "current" | "pending" }>;
  pendingActions?: Array<{
    key: string;
    label: string;
    detail: string;
    href: string;
    urgent?: boolean;
  }>;
  showInterview?: boolean;
  rejectionReason: string | null;
  queryNotes?: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  documents: TrackingDocument[];
  statusHistory: StatusHistoryEntry[];
  interview: {
    scheduledDate: string;
    scheduledTime: string;
    meetingLink: string;
    panelMembers: string;
  } | null;
  fellowship: {
    fellowshipId: string;
    stageLabel?: string;
    bankSubmitted?: boolean;
  } | null;
  fellowshipPendingSetup?: boolean;
};

const POLL_INTERVAL_MS = 5000;

const HEADLINE_STYLES: Record<
  NonNullable<TrackingHeadline["tone"]>,
  { bg: string; border: string; title: string; subtitle: string }
> = {
  success: {
    bg: "from-primary-600 to-primary-500",
    border: "border-primary-400/30",
    title: "text-white",
    subtitle: "text-primary-50/90",
  },
  progress: {
    bg: "from-[#1a5f8a] to-[#2874a6]",
    border: "border-blue-400/30",
    title: "text-white",
    subtitle: "text-blue-50/90",
  },
  warning: {
    bg: "from-amber-600 to-amber-500",
    border: "border-amber-400/30",
    title: "text-white",
    subtitle: "text-amber-50/90",
  },
  error: {
    bg: "from-red-600 to-red-500",
    border: "border-red-400/30",
    title: "text-white",
    subtitle: "text-red-50/90",
  },
  neutral: {
    bg: "from-[#4a5f56] to-[#5f7a70]",
    border: "border-gray-400/30",
    title: "text-white",
    subtitle: "text-gray-100/90",
  },
};

function relativeUpdated(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 15000) return "Updated just now";
  if (diff < 60000) return `Updated ${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `Updated ${Math.floor(diff / 60000)}m ago`;
  return `Updated at ${new Date(iso).toLocaleTimeString("en-IN")}`;
}

export function ApplicationTracker() {
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [pipeline, setPipeline] = useState<TrackingStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<"connected" | "error">("connected");
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [justUpdated, setJustUpdated] = useState(false);
  const prevSnapshot = useRef<string>("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch("/api/applications/tracking", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (res.ok) {
        const snapshot = JSON.stringify(
          (data.applications || []).map((a: TrackedApplication) => ({
            id: a.id,
            status: a.status,
            progress: a.progress,
            displayStatus: a.displayStatus,
            updatedAt: a.updatedAt,
          }))
        );
        if (silent && prevSnapshot.current && prevSnapshot.current !== snapshot) {
          setJustUpdated(true);
          setTimeout(() => setJustUpdated(false), 2500);
        }
        prevSnapshot.current = snapshot;

        setApplications(data.applications || []);
        setPipeline(data.pipeline || []);
        setLastUpdated(data.updatedAt || new Date().toISOString());
        setLiveStatus("connected");
      } else {
        setLiveStatus("error");
      }
    } catch {
      setLiveStatus("error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  function toggleSection(appId: string, section: string) {
    const key = `${appId}-${section}`;
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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

    setMessage(`${file.name} re-uploaded. Status will update after admin review.`);
    await load(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-[#e8f0ec] bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        <p className="text-sm text-muted">Loading live tracking…</p>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#dce8e2] bg-[#fafdfb] py-16 text-center">
        <Package className="mx-auto h-10 w-10 text-primary-300" />
        <p className="mt-4 text-ink-soft">No applications found. Start from the Forms section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live status bar — Flipkart style */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
          justUpdated
            ? "border-primary-300 bg-primary-50"
            : "border-[#e8f0ec] bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            <Radio className="h-3 w-3" />
            Live
          </span>
          <span
            className={`tracker-live-dot inline-flex h-2 w-2 rounded-full ${
              liveStatus === "connected" ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <span className="text-sm text-ink-soft">
            {liveStatus === "error" ? (
              <span className="font-medium text-amber-800">Connection issue — tap refresh</span>
            ) : lastUpdated ? (
              relativeUpdated(lastUpdated)
            ) : (
              "Tracking active"
            )}
          </span>
          {justUpdated && (
            <span className="text-xs font-semibold text-primary-700 animate-pulse">
              · Status changed
            </span>
          )}
        </div>
        <Button variant="secondary" className="h-8 text-xs" loading={refreshing} onClick={() => load()}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {message && (
        <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-800">
          {message}
        </div>
      )}

      {applications.map((app, appIndex) => {
        const isRejected = app.status === "REJECTED" || app.status === "NOT_ELIGIBLE";
        const headline = app.headline ?? {
          title: app.displayStatus ?? "Tracking your application",
          subtitle: "Updates refresh automatically every few seconds",
          tone: "progress" as const,
        };
        const styles = HEADLINE_STYLES[headline.tone];
        const timeline = app.timeline ?? [];
        const compactSteps =
          app.compactSteps ??
          pipeline.map((s, i) => ({
            key: s.key,
            label: s.label,
            state: "pending" as const,
          }));
        const docsOpen = expandedSections[`${app.id}-docs`] ?? false;
        const activityOpen = expandedSections[`${app.id}-activity`] ?? true;

        return (
          <article
            key={app.id}
            className="tracker-slide-up overflow-hidden rounded-2xl border border-[#e8f0ec] bg-white shadow-[0_4px_24px_rgba(27,107,82,0.08)]"
            style={{ animationDelay: `${appIndex * 50}ms` }}
          >
            {/* Tracking ID row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef4f0] bg-[#fafdfb] px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary-600" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    Tracking ID
                  </p>
                  <p className="font-mono text-lg font-bold tracking-wide text-primary-800">
                    {app.applicationNumber}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-muted">
                <p>Applied {formatDate(app.createdAt)}</p>
                {app.submittedAt && <p>Submitted {formatDate(app.submittedAt)}</p>}
              </div>
            </div>

            {/* Hero status banner — Flipkart delivery style */}
            <div
              className={`border-b bg-gradient-to-r px-4 py-5 sm:px-6 ${styles.bg} ${styles.border}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className={`text-xl font-bold leading-snug sm:text-2xl ${styles.title}`}>
                    {headline.title}
                  </p>
                  <p className={`mt-1 text-sm ${styles.subtitle}`}>{headline.subtitle}</p>
                </div>
                <div className="flex shrink-0 flex-col items-center rounded-xl bg-white/15 px-4 py-2 backdrop-blur-sm">
                  <span className={`text-2xl font-bold ${styles.title}`}>{app.progress}%</span>
                  <span className={`text-[10px] font-medium uppercase ${styles.subtitle}`}>
                    Complete
                  </span>
                </div>
              </div>
            </div>

            {/* Horizontal progress rail */}
            <div className="border-b border-[#eef4f0] px-3 py-5 sm:px-6">
              <FlipkartProgressRail steps={compactSteps} />
            </div>

            {/* Vertical timeline — main Flipkart-style tracker */}
            <div className="px-4 py-5 sm:px-6">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">
                Detailed tracking
              </h3>
              {timeline.length > 0 ? (
                <FlipkartTrackingTimeline steps={timeline} />
              ) : (
                <p className="text-sm text-muted">Timeline loading…</p>
              )}
            </div>

            {/* Action alerts */}
            {app.status === "QUERY_RAISED" && app.queryNotes && (
              <div className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:mx-6">
                <strong>Query from verification team:</strong> {app.queryNotes}
              </div>
            )}

            {isRejected && app.rejectionReason && (
              <div className="mx-4 mb-4 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 sm:mx-6">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-medium text-red-800">Reason</p>
                  <p className="mt-1 text-sm text-red-600">{app.rejectionReason}</p>
                </div>
              </div>
            )}

            {app.fellowshipPendingSetup && (
              <div className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:mx-6">
                <p className="font-medium text-amber-900">Fellowship setup required</p>
                <p className="mt-1 text-sm text-amber-800">
                  Complete agreement, bank details, and Installment 1 documents in My Fellowship.
                </p>
                <Link
                  href="/applicant/fellowship"
                  className="mt-3 inline-block rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
                >
                  Open My Fellowship
                </Link>
              </div>
            )}

            {app.showInterview && app.interview && (
              <div className="mx-4 mb-4 rounded-xl border border-violet-100 bg-violet-50/60 p-4 sm:mx-6">
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
                  Join meeting →
                </a>
              </div>
            )}

            {app.pendingActions && app.pendingActions.length > 0 && (
              <div className="mx-4 mb-4 space-y-2 sm:mx-6">
                {app.pendingActions.map((action) => (
                  <div
                    key={action.key}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 ${
                      action.urgent
                        ? "border-amber-200 bg-amber-50"
                        : "border-primary-100 bg-primary-50/50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">{action.label}</p>
                      <p className="text-xs text-ink-soft">{action.detail}</p>
                    </div>
                    <Link
                      href={action.href}
                      className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700"
                    >
                      Take action
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Collapsible documents */}
            {app.documents.length > 0 && (
              <div className="border-t border-[#eef4f0]">
                <button
                  type="button"
                  onClick={() => toggleSection(app.id, "docs")}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#fafdfb] sm:px-6"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <FileCheck2 className="h-4 w-4 text-primary-500" />
                    Documents ({app.documents.length})
                  </span>
                  {docsOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted" />
                  )}
                </button>
                {docsOpen && (
                  <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-6">
                    {app.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className={`rounded-xl border p-3 ${
                          doc.status === "RESUBMIT_REQUIRED"
                            ? "border-amber-200 bg-amber-50/60"
                            : doc.status === "REJECTED"
                              ? "border-red-200 bg-red-50/60"
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
                              className="mt-0.5 block text-xs text-primary-600 hover:underline"
                            >
                              {doc.fileName}
                            </a>
                          </div>
                          <DocStatusBadge status={doc.status} />
                        </div>
                        {doc.rejectionReason && (
                          <p className="mt-2 text-xs text-red-700">{doc.rejectionReason}</p>
                        )}
                        {(doc.canResubmit ||
                          doc.status === "REJECTED" ||
                          doc.status === "RESUBMIT_REQUIRED") && (
                          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50">
                            <Upload className="h-3 w-3" />
                            {uploadingDoc === doc.type ? "Uploading…" : "Re-upload"}
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
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Collapsible activity log */}
            {app.statusHistory.length > 0 && (
              <div className="border-t border-[#eef4f0]">
                <button
                  type="button"
                  onClick={() => toggleSection(app.id, "activity")}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#fafdfb] sm:px-6"
                >
                  <span className="text-sm font-semibold text-ink">
                    Activity log ({app.statusHistory.length})
                  </span>
                  {activityOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted" />
                  )}
                </button>
                {activityOpen && (
                  <div className="space-y-2 px-4 pb-4 sm:px-6">
                    {app.statusHistory.slice(0, 8).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex gap-3 rounded-lg border border-[#eef4f0] bg-[#fafdfb] px-3 py-2.5"
                      >
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-400" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-ink">
                            {entry.notes || entry.toStatus.replace(/_/g, " ")}
                          </p>
                          <p className="text-[11px] text-muted">{formatDate(entry.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {app.fellowship && (
              <div className="border-t border-[#eef4f0] bg-[#f6fbf8] px-4 py-3 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted">
                    Fellowship ID:{" "}
                    <span className="font-mono font-semibold text-primary-800">
                      {app.fellowship.fellowshipId}
                    </span>
                  </p>
                  <Link
                    href="/applicant/fellowship"
                    className="text-xs font-bold text-primary-700 hover:underline"
                  >
                    Open Fellowship Portal →
                  </Link>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
