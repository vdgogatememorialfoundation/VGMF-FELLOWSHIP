"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";

interface Applicant {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  applicationId: string | null;
  applicationNumber: string | null;
  applicationStatus: string | null;
  hasSubmittedApplication: boolean;
}

interface FormTemplate {
  id: string;
  slug: string;
  name: string;
}

interface EmailMessagingPanelProps {
  /** Optional formTemplateId to filter applicants by form */
  formTemplateId?: string;
  /** Optional form name for display */
  formName?: string;
  /** Optional callback when emails are sent */
  onEmailsSent?: (count: number) => void;
}

export function EmailMessagingPanel({
  formTemplateId,
  formName,
  onEmailsSent,
}: EmailMessagingPanelProps) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>(formTemplateId || "");
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingApplicants, setLoadingApplicants] = useState(true);
  const [loadingForms, setLoadingForms] = useState(true);
  const [messageFeedback, setMessageFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  const loadApplicants = useCallback(async (formId?: string) => {
    setLoadingApplicants(true);
    const url = formId
      ? `/api/admin/messaging/email?formTemplateId=${formId}`
      : "/api/admin/messaging/email";
    try {
      const res = await fetch(url);
      const data = await res.json();
      setApplicants(data.applicants || []);
    } catch (err) {
      console.error("Failed to load applicants:", err);
      setApplicants([]);
    }
    setLoadingApplicants(false);
  }, []);

  const loadForms = useCallback(async () => {
    setLoadingForms(true);
    try {
      const res = await fetch("/api/admin/cms");
      const data = await res.json();
      setForms(data.forms || []);
    } catch (err) {
      console.error("Failed to load forms:", err);
      setForms([]);
    }
    setLoadingForms(false);
  }, []);

  useEffect(() => {
    void loadApplicants(formTemplateId);
    void loadForms();
  }, [formTemplateId, loadApplicants, loadForms]);

  function handleFormChange(formId: string) {
    setSelectedFormId(formId);
    setSelectedApplicantIds(new Set());
    setSelectAll(false);
    void loadApplicants(formId || undefined);
  }

  function toggleApplicant(applicantId: string) {
    const newSelected = new Set(selectedApplicantIds);
    if (newSelected.has(applicantId)) {
      newSelected.delete(applicantId);
    } else {
      newSelected.add(applicantId);
    }
    setSelectedApplicantIds(newSelected);
    // If selecting individual, uncheck selectAll
    if (newSelected.size > 0) {
      setSelectAll(false);
    }
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelectAll(false);
      setSelectedApplicantIds(new Set());
    } else {
      setSelectAll(true);
      setSelectedApplicantIds(new Set(applicants.map((a) => a.id)));
    }
  }

  async function sendEmails() {
    if (!subject.trim()) {
      setMessageFeedback({ type: "error", text: "Please enter a subject" });
      return;
    }
    if (!message.trim()) {
      setMessageFeedback({ type: "error", text: "Please enter a message" });
      return;
    }
    if (!selectAll && selectedApplicantIds.size === 0) {
      setMessageFeedback({ type: "error", text: "Please select at least one applicant" });
      return;
    }

    setLoading(true);
    setMessageFeedback(null);

    const res = await fetch("/api/admin/messaging/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicantIds: selectAll ? [] : Array.from(selectedApplicantIds),
        formTemplateId: selectedFormId || undefined,
        subject: subject.trim(),
        message: message.trim(),
        selectAll,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessageFeedback({ type: "success", text: data.message });
      setSubject("");
      setMessage("");
      setSelectedApplicantIds(new Set());
      setSelectAll(false);
      if (onEmailsSent) {
        onEmailsSent(data.results?.success || 0);
      }
    } else {
      setMessageFeedback({ type: "error", text: data.error || "Failed to send emails" });
    }
  }

  const recipientCount = selectAll ? applicants.length : selectedApplicantIds.size;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Email Applicants</h3>
          <p className="text-sm text-gray-600">
            Send email notifications to fellowship applicants
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowPanel((v) => !v)}
        >
          {showPanel ? "Hide" : "Compose Email"}
        </Button>
      </div>

      {showPanel && (
        <div className="card space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Filter by Form (optional)
              </label>
              <Select
                value={selectedFormId}
                onChange={(e) => handleFormChange(e.target.value)}
                options={[
                  { value: "", label: "All Applicants" },
                  ...forms.map((f) => ({ value: f.id, label: f.name })),
                ]}
                disabled={loadingForms}
              />
            </div>

            <div className="flex items-end">
              <div className="flex items-center gap-4">
                <Checkbox
                  label={`Select All (${applicants.length} applicants)`}
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  disabled={applicants.length === 0 || loadingApplicants}
                />
              </div>
            </div>
          </div>

          {/* Selection count */}
          <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
            <span className="text-sm font-medium text-blue-800">
              {loadingApplicants ? "Loading applicants..." : 
               applicants.length === 0 ? "No applicants found" :
               `${recipientCount} of ${applicants.length} applicants selected`}
            </span>
            {!selectAll && applicants.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectAll(true);
                  setSelectedApplicantIds(new Set(applicants.map((a) => a.id)));
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Select All
              </button>
            )}
            {selectAll && (
              <button
                type="button"
                onClick={() => {
                  setSelectAll(false);
                  setSelectedApplicantIds(new Set());
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* Applicant list - show when not selecting all or always show list */}
          {applicants.length > 0 && (
            <div className="max-h-80 overflow-y-auto rounded-lg border bg-white">
              <div className="p-2">
                {applicants.map((applicant) => (
                  <label
                    key={applicant.id}
                    className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectAll || selectedApplicantIds.has(applicant.id)}
                      onChange={() => {
                        if (selectAll) {
                          toggleSelectAll();
                        } else {
                          toggleApplicant(applicant.id);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{applicant.name || "Unnamed"}</p>
                      <p className="truncate text-xs text-gray-500">{applicant.email || "No email"}</p>
                    </div>
                    {applicant.applicationNumber && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                        {applicant.applicationNumber}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {loadingApplicants && (
            <div className="py-4 text-center text-gray-500">Loading applicants...</div>
          )}

          <div>
            <Input
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
              required
            />
          </div>

          <div>
            <Textarea
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here..."
              rows={6}
              required
            />
          </div>

          {messageFeedback && (
            <div
              className={`rounded-lg p-3 text-sm ${
                messageFeedback.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {messageFeedback.text}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {recipientCount > 0
                ? `This email will be sent to ${recipientCount} applicant${recipientCount === 1 ? "" : "s"}`
                : "Select applicants to send email"}
            </p>
            <Button
              onClick={sendEmails}
              loading={loading}
              disabled={recipientCount === 0 || !subject.trim() || !message.trim()}
            >
              Send Email{recipientCount > 0 ? ` to ${recipientCount}` : ""}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
