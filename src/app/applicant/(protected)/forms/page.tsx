"use client";

import { useState, useEffect } from "react";
import { DynamicFormFields } from "@/components/forms/DynamicFormFields";
import { Button } from "@/components/ui/Button";
import { formatApplicationNumber } from "@/lib/application-number";

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

export default function ApplicantFormsPage() {
  const [template, setTemplate] = useState<{
    id: string;
    name: string;
    fields: FormField[];
  } | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submissionId, setSubmissionId] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/forms?slug=fellowship-application")
      .then((r) => r.json())
      .then((d) => {
        if (d.template) {
          setTemplate(d.template);
          const init: Record<string, string> = {};
          d.template.fields.forEach((f: FormField) => {
            init[f.fieldKey] = "";
          });
          setValues(init);
        }
      });
  }, []);

  function updateField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function save(status: "DRAFT" | "SUBMITTED") {
    if (!template) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formTemplateId: template.id,
        data: values,
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
    if (data.applicationNumber) {
      setApplicationNumber(data.applicationNumber);
    }
    setSuccess(
      status === "SUBMITTED"
        ? data.applicationNumber
          ? `Application submitted successfully! Your 12-digit application number is ${data.applicationNumber}. A confirmation email has been sent.`
          : "Application submitted successfully!"
        : "Draft saved successfully!"
    );
  }

  if (!template) {
    return <p className="py-12 text-center text-gray-500">Loading form...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
        <p className="mt-1 text-gray-600">Complete all required fields and submit your application</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}
      {applicationNumber && (
        <div className="card border-2 border-gold/40 bg-[#fffdf6] p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Application Tracking Number</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-primary-700">{applicationNumber}</p>
          <p className="mt-1 text-sm text-muted">{formatApplicationNumber(applicationNumber)}</p>
          <p className="mt-3 text-sm text-muted">Save this number and check your email for confirmation.</p>
        </div>
      )}

      <div className="card">
        <DynamicFormFields fields={template.fields} values={values} onChange={updateField} />
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" loading={loading} onClick={() => save("DRAFT")}>
            Save Draft
          </Button>
          <Button loading={loading} onClick={() => save("SUBMITTED")}>
            Submit Application
          </Button>
        </div>
      </div>
    </div>
  );
}
