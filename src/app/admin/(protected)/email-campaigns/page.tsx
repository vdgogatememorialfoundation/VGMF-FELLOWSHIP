"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Send, Users, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface ApplicationStatusOption {
  status: string;
  count: number;
}

interface EmailFilters {
  applicationStatuses: ApplicationStatusOption[];
  fellowshipYears: number[];
  counts: {
    totalApplicants: number;
    totalWithFellowship: number;
    totalWithApplications: number;
  };
}

interface Applicant {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
}

type RecipientType = "all" | "by_status" | "by_fellowship" | "by_year" | "specific";

export default function AdminEmailCampaignsPage() {
  const [filters, setFilters] = useState<EmailFilters | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ sent: number; failed: number; total: number } | null>(null);

  // Recipient selection
  const [recipientType, setRecipientType] = useState<RecipientType>("all");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [fellowshipYear, setFellowshipYear] = useState<string>("");
  const [fellowshipOnly, setFellowshipOnly] = useState(false);
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([]);
  const [showApplicantSelector, setShowApplicantSelector] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // Email content
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    fetch("/api/admin/email-campaigns")
      .then((r) => r.json())
      .then((d) => {
        setFilters(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load filters");
        setLoading(false);
      });
  }, []);

  function toggleStatus(status: string) {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  function toggleApplicant(id: string) {
    setSelectedApplicants((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  function selectAllApplicants() {
    setSelectedApplicants(applicants.map((a) => a.id));
  }

  function deselectAllApplicants() {
    setSelectedApplicants([]);
  }

  async function loadApplicants() {
    setLoadingApplicants(true);
    try {
      const res = await fetch("/api/admin/applicants");
      const data = await res.json();
      setApplicants(data.applicants || []);
    } catch {
      console.error("Failed to load applicants");
    }
    setLoadingApplicants(false);
  }

  async function sendEmailCampaign() {
    if (!subject.trim()) {
      setError("Please enter an email subject");
      return;
    }
    if (!body.trim()) {
      setError("Please enter email content");
      return;
    }

    setError("");
    setSuccess(null);
    setSending(true);

    try {
      const res = await fetch("/api/admin/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientType,
          applicationStatuses: selectedStatuses,
          fellowshipYear: fellowshipYear ? parseInt(fellowshipYear) : undefined,
          fellowshipOnly,
          applicantIds: selectedApplicants,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send email campaign");
        return;
      }

      setSuccess({
        sent: data.sent,
        failed: data.failed,
        total: data.total,
      });
    } catch {
      setError("Failed to send email campaign. Please try again.");
    }

    setSending(false);
  }

  function getRecipientCount(): string {
    if (!filters) return "...";

    switch (recipientType) {
      case "all":
        return `${filters.counts.totalApplicants} applicants`;
      case "by_status":
        if (selectedStatuses.length === 0) return "Select at least one status";
        const statusCounts = filters.applicationStatuses
          .filter((s) => selectedStatuses.includes(s.status))
          .reduce((acc, s) => acc + s.count, 0);
        return `${statusCounts} applicant(s) with selected status(es)`;
      case "by_fellowship":
        return `${filters.counts.totalWithFellowship} applicant(s) with fellowships`;
      case "by_year":
        return fellowshipYear ? `Applicants with fellowship in ${fellowshipYear}` : "Select a year";
      case "specific":
        return selectedApplicants.length > 0
          ? `${selectedApplicants.length} selected applicant(s)`
          : "Select applicants";
    }
  }

  function canSend(): boolean {
    if (!subject.trim() || !body.trim()) return false;
    if (sending) return false;

    switch (recipientType) {
      case "all":
      case "by_fellowship":
        return true;
      case "by_status":
        return selectedStatuses.length > 0;
      case "by_year":
        return !!fellowshipYear;
      case "specific":
        return selectedApplicants.length > 0;
      default:
        return false;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
        <p className="mt-1 text-gray-600">
          Send bulk emails to fellowship applicants
        </p>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Email campaign sent successfully!</span>
          </div>
          <p className="mt-2 text-sm text-green-700">
            Sent: {success.sent} | Failed: {success.failed} | Total: {success.total}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-800">
            <XCircle className="h-5 w-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recipient Selection */}
        <div className="card space-y-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5 text-primary-600" />
            Select Recipients
          </h2>

          <div className="space-y-2">
            <label className="label-field">Recipient Type</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="recipientType"
                  value="all"
                  checked={recipientType === "all"}
                  onChange={() => setRecipientType("all")}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-sm">All Applicants</span>
                <span className="ml-auto text-xs text-gray-500">
                  ({filters?.counts.totalApplicants})
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="recipientType"
                  value="by_status"
                  checked={recipientType === "by_status"}
                  onChange={() => setRecipientType("by_status")}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-sm">By Application Status</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="recipientType"
                  value="by_fellowship"
                  checked={recipientType === "by_fellowship"}
                  onChange={() => setRecipientType("by_fellowship")}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-sm">Fellowship Holders Only</span>
                <span className="ml-auto text-xs text-gray-500">
                  ({filters?.counts.totalWithFellowship})
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="recipientType"
                  value="by_year"
                  checked={recipientType === "by_year"}
                  onChange={() => setRecipientType("by_year")}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-sm">By Fellowship Year</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="recipientType"
                  value="specific"
                  checked={recipientType === "specific"}
                  onChange={() => {
                    setRecipientType("specific");
                    if (applicants.length === 0) {
                      loadApplicants();
                    }
                  }}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-sm">Specific Applicants</span>
              </label>
            </div>
          </div>

          {/* By Status Selection */}
          {recipientType === "by_status" && filters && (
            <div className="space-y-2">
              <label className="label-field">Application Statuses</label>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                {filters.applicationStatuses.map((s) => (
                  <label key={s.status} className="flex items-center gap-2 py-1">
                    <Checkbox
                      checked={selectedStatuses.includes(s.status)}
                      onChange={() => toggleStatus(s.status)}
                    />
                    <span className="flex-1 text-sm">{s.status.replace(/_/g, " ")}</span>
                    <span className="text-xs text-gray-500">({s.count})</span>
                  </label>
                ))}
              </div>
              {selectedStatuses.length > 0 && (
                <p className="text-xs text-gray-500">
                  {selectedStatuses.length} status(es) selected
                </p>
              )}
            </div>
          )}

          {/* Fellowship Year Selection */}
          {recipientType === "by_year" && filters && (
            <div className="space-y-2">
              <Select
                label="Fellowship Year"
                value={fellowshipYear}
                onChange={(e) => setFellowshipYear(e.target.value)}
                options={
                  filters.fellowshipYears.length > 0
                    ? filters.fellowshipYears.map((y) => ({ value: String(y), label: String(y) }))
                    : [{ value: "", label: "No fellowship years available" }]
                }
              />
            </div>
          )}

          {/* Fellowship Only Toggle */}
          {recipientType === "by_fellowship" && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={fellowshipOnly}
                onChange={(e) => setFellowshipOnly(e.target.checked)}
              />
              <span className="text-sm">Only applicants with active fellowships</span>
            </div>
          )}

          {/* Specific Applicants Selection */}
          {recipientType === "specific" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="label-field mb-0">Select Applicants</label>
                {applicants.length > 0 && (
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllApplicants}
                      className="text-primary-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={deselectAllApplicants}
                      className="text-gray-600 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  loadApplicants();
                  setShowApplicantSelector(!showApplicantSelector);
                }}
              >
                {showApplicantSelector ? "Hide Applicant List" : "Show Applicant List"}
                {selectedApplicants.length > 0 && (
                  <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
                    {selectedApplicants.length} selected
                  </span>
                )}
              </Button>
              {showApplicantSelector && (
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {loadingApplicants ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : applicants.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">No applicants found</p>
                  ) : (
                    applicants.map((a) => (
                      <label key={a.id} className="flex items-center gap-2 py-1">
                        <Checkbox
                          checked={selectedApplicants.includes(a.id)}
                          onChange={() => toggleApplicant(a.id)}
                        />
                        <div className="flex-1">
                          <span className="text-sm">{a.name}</span>
                          <span className="ml-2 text-xs text-gray-500">{a.email}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recipient Count Summary */}
          <div className="rounded-lg bg-blue-50 p-3">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Recipients:</span>
            </div>
            <p className="mt-1 text-sm text-blue-700">{getRecipientCount()}</p>
          </div>
        </div>

        {/* Email Content */}
        <div className="card space-y-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Send className="h-5 w-5 text-primary-600" />
            Email Content
          </h2>

          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject"
            required
          />

          <Textarea
            label="Message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter your message here...&#10;&#10;This message will be sent to all selected recipients."
            rows={12}
            required
          />

          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-medium">Tips:</p>
            <ul className="mt-1 list-disc pl-4">
              <li>The email will be automatically personalized with the recipient&apos;s name</li>
              <li>Keep your message clear and concise</li>
              <li>Include any important dates or deadlines</li>
              <li>Provide clear instructions for next steps</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between rounded-lg border bg-white p-4">
        <div>
          <p className="text-sm text-gray-600">
            Ready to send email campaign to {getRecipientCount().toLowerCase()}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSubject("");
              setBody("");
              setRecipientType("all");
              setSelectedStatuses([]);
              setFellowshipYear("");
              setSelectedApplicants([]);
              setError("");
              setSuccess(null);
            }}
          >
            Clear Form
          </Button>
          <Button
            type="button"
            onClick={sendEmailCampaign}
            disabled={!canSend()}
            loading={sending}
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending..." : "Send Email Campaign"}
          </Button>
        </div>
      </div>
    </div>
  );
}
