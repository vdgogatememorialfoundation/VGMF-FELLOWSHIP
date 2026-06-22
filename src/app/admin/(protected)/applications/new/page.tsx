"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DynamicFormFields } from "@/components/forms/DynamicFormFields";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FILE_FIELD_DOCUMENT_TYPES } from "@/lib/form-validation";
import { formatApplicationNumber } from "@/lib/application-number";
import { Search, UserPlus, ArrowLeft, CheckCircle2 } from "lucide-react";

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

interface SelectedUser {
  id: string;
  email: string;
  name: string;
}

interface SearchResult {
  id: string;
  email: string;
  name: string;
}

export default function AdminNewApplicationPage() {
  // Step management
  const [step, setStep] = useState<"select-user" | "fill-form">("select-user");

  // User search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

  // Form state
  const [template, setTemplate] = useState<{
    id: string;
    name: string;
    fields: FormField[];
  } | null>(null);
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
  const [formLoading, setFormLoading] = useState(false);

  // Search for users
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/users/search?q=${encodeURIComponent(searchQuery.trim())}`
        );
        const data = await res.json();
        setSearchResults(data.users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load form for selected user
  const loadFormForUser = useCallback(
    async (userId: string) => {
      setFormLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/forms/proxy?userId=${userId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load form");
          setFormLoading(false);
          return;
        }

        if (data.template) {
          setTemplate(data.template);

          const init: Record<string, string | boolean> = {};
          data.template.fields.forEach((f: FormField) => {
            if (f.fieldType === "CHECKBOX") {
              init[f.fieldKey] = false;
            } else {
              init[f.fieldKey] = "";
            }
          });

          if (data.submission?.data) {
            const saved = data.submission.data as Record<string, unknown>;
            for (const key of Object.keys(init)) {
              const val = saved[key];
              if (typeof val === "boolean") {
                init[key] = val;
              } else if (val != null) {
                init[key] = String(val);
              }
            }
            setSubmissionId(data.submission.id);
            setSubmissionStatus(data.submission.status);
          }

          if (data.uploadedFiles) {
            setUploadedFiles(data.uploadedFiles);
            for (const [key, uploaded] of Object.entries(
              data.uploadedFiles as Record<string, boolean>
            )) {
              if (uploaded) init[`${key}_uploaded`] = true;
            }
          }

          if (data.applicationId) setApplicationId(data.applicationId);
          setValues(init);
        }
      } catch {
        setError("Failed to load form");
      } finally {
        setFormLoading(false);
      }
    },
    []
  );

  function selectUser(user: SearchResult) {
    setSelectedUser(user);
    setStep("fill-form");
    loadFormForUser(user.id);
  }

  function updateField(key: string, value: string | boolean) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function ensureProxyApplicationId(): Promise<string | null> {
    if (applicationId) return applicationId;
    if (!template || !selectedUser) return null;

    const res = await fetch("/api/admin/forms/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedUser.id,
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
    setFileUploading(fieldKey);
    setError("");

    const appId = await ensureProxyApplicationId();
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
    if (!template || !selectedUser) return;

    setLoading(true);
    setError("");
    setSuccess("");

    const payload = { ...values };
    for (const [key, uploaded] of Object.entries(uploadedFiles)) {
      if (uploaded) payload[`${key}_uploaded`] = true;
    }

    const res = await fetch("/api/admin/forms/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedUser.id,
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
          ? `Application submitted on behalf of ${selectedUser.name}! Application number: ${data.applicationNumber}`
          : "Application submitted successfully!"
        : "Draft saved successfully!"
    );
  }

  const isSubmitted = submissionStatus === "SUBMITTED";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/applications"
          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Application</h1>
          <p className="mt-1 text-gray-600">
            Fill application form on behalf of an applicant
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}

      {/* Step 1: Select User */}
      {step === "select-user" && (
        <div className="card space-y-4 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Select Applicant
              </h2>
              <p className="text-sm text-gray-500">
                Search by name or email to find the applicant
              </p>
            </div>
          </div>

          <div className="relative">
            <Input
              label="Search applicant"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type name or email..."
            />
            <Search className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-gray-400" />
          </div>

          {searching && (
            <p className="text-sm text-gray-500">Searching...</p>
          )}

          {searchResults.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectUser(user)}
                  className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-primary-50 last:border-0"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery.trim().length >= 2 &&
            !searching &&
            searchResults.length === 0 && (
              <p className="text-sm text-gray-500">
                No applicants found. Make sure the user has registered first via{" "}
                <Link
                  href="/admin/accounts"
                  className="font-medium text-primary-600 underline"
                >
                  All Accounts
                </Link>
                .
              </p>
            )}
        </div>
      )}

      {/* Step 2: Fill Form */}
      {step === "fill-form" && selectedUser && (
        <>
          {/* Selected user badge */}
          <div className="card flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Filling form for: {selectedUser.name}
                </p>
                <p className="text-xs text-gray-500">{selectedUser.email}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="text-xs"
              onClick={() => {
                setStep("select-user");
                setSelectedUser(null);
                setTemplate(null);
                setValues({});
                setSubmissionId("");
                setSubmissionStatus("");
                setApplicationId("");
                setApplicationNumber("");
                setUploadedFiles({});
                setError("");
                setSuccess("");
              }}
            >
              Change Applicant
            </Button>
          </div>

          {applicationNumber && (
            <div className="card border-2 border-gold/40 bg-[#fffdf6] p-5 text-center">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Application Tracking Number
                </p>
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-primary-700">
                {applicationNumber}
              </p>
              <p className="mt-1 text-sm text-muted">
                {formatApplicationNumber(applicationNumber)}
              </p>
            </div>
          )}

          {formLoading ? (
            <p className="py-12 text-center text-gray-500">Loading form...</p>
          ) : template ? (
            isSubmitted ? (
              <div className="card p-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
                <p className="mt-3 text-lg font-semibold text-primary-700">
                  Application Submitted
                </p>
                <p className="mt-2 text-gray-600">
                  This application has been submitted on behalf of{" "}
                  {selectedUser.name}. It is now in the review pipeline.
                </p>
                <Link
                  href="/admin/applications"
                  className="mt-4 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Back to Applications
                </Link>
              </div>
            ) : (
              <div className="card">
                <div className="border-b border-gray-100 bg-amber-50 px-4 py-3 sm:px-6">
                  <p className="text-sm text-amber-800">
                    <strong>Admin mode:</strong> You are filling this form on behalf of
                    the applicant. The Digital Undertaking requirement is waived.
                  </p>
                </div>
                <div className="p-4 sm:p-6">
                  <DynamicFormFields
                    fields={template.fields}
                    values={values}
                    onChange={updateField}
                    uploadedFiles={uploadedFiles}
                    onFileSelect={handleFileSelect}
                    fileUploading={fileUploading}
                  />
                </div>
                <div className="border-t border-gray-100 px-4 py-4 sm:px-6">
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      loading={loading}
                      onClick={() => save("DRAFT")}
                    >
                      Save Draft
                    </Button>
                    <Button loading={loading} onClick={() => save("SUBMITTED")}>
                      Submit Application
                    </Button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <p className="py-12 text-center text-gray-500">
              Form template not available.
            </p>
          )}
        </>
      )}
    </div>
  );
}
