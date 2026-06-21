"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DynamicFormFields } from "@/components/forms/DynamicFormFields";
import { FormSchedulePanel } from "@/components/forms/FormScheduleCountdown";
import { Button } from "@/components/ui/Button";
import { formatApplicationNumber } from "@/lib/application-number";
import { FILE_FIELD_DOCUMENT_TYPES } from "@/lib/form-validation";
import { formatScheduleDateTime, type FormSchedulePhase } from "@/lib/form-schedule";

interface FormField {
  id: string;
  section: string;
  label: string;
  fieldKey: string;
  fieldType: string;
  placeholder?: string | null;
  helpText?: string | null;
  required: boolean;
  options?: string | null;
}

interface FormSchedule {
  phase: FormSchedulePhase;
  open: boolean;
  message: string | null;
  opensAt: string | null;
  closesAt: string | null;
}

export default function ApplicantFormsPage() {
  const [template, setTemplate] = useState<{
    id: string;
    name: string;
    fields: FormField[];
  } | null>(null);
  const [schedule, setSchedule] = useState<FormSchedule | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [submissionId, setSubmissionId] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, boolean>>({});
  const [fileUploading, setFileUploading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [digitalUndertaking, setDigitalUndertaking] = useState<{
    id: string;
    pdfUrl: string;
  } | null>(null);
  const [applicationQuery, setApplicationQuery] = useState<{
    status: string;
    queryNotes: string | null;
    requiresResubmit: boolean;
    openQuery: { id: string; message: string; requiresFullResubmit: boolean } | null;
  } | null>(null);

  const resubmitRequired =
    applicationQuery?.status === "QUERY_RAISED" && applicationQuery.requiresResubmit;
  const formLocked = submissionStatus === "SUBMITTED" && !resubmitRequired;

  const loadForm = useCallback(() => {
    setPageLoading(true);
    fetch("/api/forms?slug=fellowship-application")
      .then((r) => r.json())
      .then((d) => {
        if (d.template) {
          setTemplate(d.template);
          setSchedule(d.schedule || null);

          const init: Record<string, string | boolean> = {};
          d.template.fields.forEach((f: FormField) => {
            if (f.fieldType === "CHECKBOX") {
              init[f.fieldKey] = false;
            } else {
              init[f.fieldKey] = "";
            }
          });

          if (d.submission?.data) {
            const saved = d.submission.data as Record<string, unknown>;
            for (const key of Object.keys(init)) {
              const val = saved[key];
              if (typeof val === "boolean") {
                init[key] = val;
              } else if (val != null) {
                init[key] = String(val);
              }
            }
            setSubmissionId(d.submission.id);
            setSubmissionStatus(d.submission.status);
            if (d.submission.status === "SUBMITTED" && saved.application_number) {
              setApplicationNumber(String(saved.application_number));
            }
          }

          if (d.uploadedFiles) {
            setUploadedFiles(d.uploadedFiles);
            for (const [key, uploaded] of Object.entries(
              d.uploadedFiles as Record<string, boolean>
            )) {
              if (uploaded) init[`${key}_uploaded`] = true;
            }
          }

          if (d.applicationId) setApplicationId(d.applicationId);
          if (d.digitalUndertaking) setDigitalUndertaking(d.digitalUndertaking);
          if (d.applicationQuery) setApplicationQuery(d.applicationQuery);
          setValues(init);
        }
      })
      .finally(() => setPageLoading(false));
  }, []);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  function updateField(key: string, value: string | boolean) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function ensureApplicationId(): Promise<string | null> {
    if (applicationId) return applicationId;
    if (!template) return null;

    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formTemplateId: template.id,
        data: values,
        status: "DRAFT",
        submissionId: submissionId || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save draft before upload");
      return null;
    }

    setSubmissionId(data.submission.id);
    if (data.applicationId) setApplicationId(data.applicationId);
    return data.applicationId as string | null;
  }

  async function handleFileSelect(fieldKey: string, file: File) {
    if (formLocked) return;

    setFileUploading(fieldKey);
    setError("");

    const appId = await ensureApplicationId();
    if (!appId) {
      setFileUploading(null);
      return;
    }

    const docType = FILE_FIELD_DOCUMENT_TYPES[fieldKey];
    if (!docType) {
      setError("This file field is not configured for upload");
      setFileUploading(null);
      return;
    }

    const formData = new FormData();
    formData.append("applicationId", appId);
    formData.append("type", docType);
    formData.append("file", file);

    const res = await fetch("/api/documents", { method: "POST", body: formData });
    const data = await res.json();
    setFileUploading(null);

    if (!res.ok) {
      setError(data.error || "Failed to upload file");
      return;
    }

    setUploadedFiles((prev) => ({ ...prev, [fieldKey]: true }));
    updateField(`${fieldKey}_uploaded`, true);
    setSuccess(`${file.name} uploaded successfully`);
  }

  async function save(status: "DRAFT" | "SUBMITTED") {
    if (!template) return;
    if (formLocked) return;
    if (!schedule?.open) {
      setError(schedule?.message || "Applications are currently closed");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const payload = { ...values };
    for (const [key, uploaded] of Object.entries(uploadedFiles)) {
      if (uploaded) payload[`${key}_uploaded`] = true;
    }

    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formTemplateId: template.id,
        data: payload,
        status,
        submissionId: submissionId || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to save");
      return;
    }

    setSubmissionId(data.submission.id);
    setSubmissionStatus(data.submission.status);
    if (data.applicationId) setApplicationId(data.applicationId);

    if (data.applicationNumber) {
      setApplicationNumber(data.applicationNumber);
      updateField("application_number", data.applicationNumber);
    }

    setSuccess(
      status === "SUBMITTED"
        ? data.applicationNumber
          ? `Application submitted successfully! Your 12-digit application number is ${data.applicationNumber}. A confirmation email has been sent.`
          : "Application submitted successfully!"
        : "Draft saved successfully!"
    );
  }

  if (pageLoading) {
    return <p className="py-12 text-center text-gray-500">Loading form...</p>;
  }

  if (!template) {
    return <p className="py-12 text-center text-gray-500">Application form not available.</p>;
  }

  const isSubmitted = formLocked;
  const formLive = schedule?.phase === "open";
  const formWaiting = schedule && !formLive && !isSubmitted;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
        <p className="mt-1 text-gray-600">
          {formLive
            ? "Complete all required fields and submit your application"
            : formWaiting
              ? "The application form will appear here when the window opens"
              : "Your fellowship application"}
        </p>
        {formLive && schedule?.opensAt && (
          <p className="mt-2 text-sm text-gray-500">
            Application window: {formatScheduleDateTime(schedule.opensAt) || "—"} to{" "}
            {formatScheduleDateTime(schedule.closesAt) || "open"}
          </p>
        )}
      </div>

      {formWaiting && schedule && (
        <FormSchedulePanel
          schedule={schedule}
          formName={template.name}
          onRefresh={loadForm}
        />
      )}

      {formWaiting && schedule?.phase !== "upcoming" && (
        <Link href="/#notices" className="inline-block text-sm font-medium text-primary-700 underline">
          View official notices
        </Link>
      )}

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {resubmitRequired && formLive && (
        <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-5">
          <h2 className="font-semibold text-orange-900">Query — full resubmission required</h2>
          <p className="mt-2 text-sm text-orange-800">
            {applicationQuery?.openQuery?.message || applicationQuery?.queryNotes}
          </p>
          <p className="mt-2 text-sm text-orange-900">
            Please update all application details and documents below, then submit again.
          </p>
        </div>
      )}

      {!isSubmitted && applicationId && formLive && (
        <div
          className={`rounded-xl border p-4 ${
            digitalUndertaking
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <p className="font-medium text-gray-900">Digital Undertaking</p>
          {digitalUndertaking ? (
            <p className="mt-1 text-sm text-green-800">
              Completed —{" "}
              <a
                href={digitalUndertaking.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View signed PDF
              </a>
            </p>
          ) : (
            <p className="mt-1 text-sm text-amber-900">
              Required before final submission.{" "}
              <Link href="/applicant/undertaking" className="font-medium underline">
                Complete Digital Undertaking →
              </Link>
            </p>
          )}
        </div>
      )}

      {applicationNumber && (
        <div className="card border-2 border-gold/40 bg-[#fffdf6] p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Application Tracking Number
          </p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-primary-700">
            {applicationNumber}
          </p>
          <p className="mt-1 text-sm text-muted">{formatApplicationNumber(applicationNumber)}</p>
          <p className="mt-3 text-sm text-muted">
            Save this number and check your email for confirmation.
          </p>
        </div>
      )}

      {isSubmitted ? (
        <div className="card p-6 text-center">
          <p className="text-lg font-semibold text-primary-700">Application Submitted</p>
          <p className="mt-2 text-gray-600">
            Your fellowship application has been submitted and cannot be edited. Track status from
            your dashboard.
          </p>
        </div>
      ) : formLive || resubmitRequired ? (
        <div className="card">
          <DynamicFormFields
            fields={template.fields}
            values={values}
            onChange={updateField}
            uploadedFiles={uploadedFiles}
            onFileSelect={handleFileSelect}
            fileUploading={fileUploading}
          />
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" loading={loading} onClick={() => save("DRAFT")}>
              Save Draft
            </Button>
            <Button loading={loading} onClick={() => save("SUBMITTED")}>
              Submit Application
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
