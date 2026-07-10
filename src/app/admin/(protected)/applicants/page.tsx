"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Mail,
  Send,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  FileText,
  Plus,
  RefreshCw,
} from "lucide-react";

interface ApplicantApplication {
  id: string;
  applicationNumber: string;
  status: string;
}

interface Applicant {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  applications: ApplicantApplication[];
}

interface FellowshipForm {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  applicantCount: number;
}

interface ApplicationForEmail {
  id: string;
  submissionId: string;
  submittedAt: string | null;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  applicationId: string | null;
  applicationNumber: string | null;
  applicationStatus: string | null;
}

interface SendResult {
  id: string;
  name: string;
  email: string;
  ok: boolean;
  error?: string;
}

export default function AdminApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [fellowshipForms, setFellowshipForms] = useState<FellowshipForm[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Email composition state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [formApplicants, setFormApplicants] = useState<ApplicationForEmail[]>([]);
  const [loadingApplicants, setLoadingApplications] = useState(false);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailResults, setEmailResults] = useState<SendResult[]>([]);

  function load() {
    fetch("/api/admin/applicants")
      .then((r) => r.json())
      .then((d) => setApplicants(d.applicants || []));
  }

  useEffect(() => {
    load();
  }, []);

  async function createApplicant(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/admin/applicants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create applicant");
      return;
    }

    setForm({
      name: "",
      email: "",
      phone: "",
    });
    setMessage(
      `Applicant account created. User ID: ${data.applicant.userId}. Login: ${data.applicant.loginPath}. Credentials have been emailed.`
    );
    load();
  }

  async function toggleActive(id: string, isActive: boolean) {
    const res = await fetch("/api/admin/applicants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });

    if (res.ok) load();
  }

  async function deleteApplicant(id: string) {
    if (!window.confirm("Are you sure you want to delete this applicant? This action cannot be undone.")) return;

    const res = await fetch(`/api/admin/applicants?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      load();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete applicant");
    }
  }

  // Email functions
  function openEmailModal() {
    setSelectedFormId("");
    setFormApplicants([]);
    setSelectedApplicationIds([]);
    setEmailSubject("");
    setEmailMessage("");
    setEmailSuccess("");
    setEmailResults([]);
    // Fetch fellowship forms
    fetch("/api/admin/messages")
      .then((r) => r.json())
      .then((d) => {
        if (d.fellowshipForms) {
          setFellowshipForms(d.fellowshipForms);
        }
      });
    setShowEmailModal(true);
  }

  async function fetchApplicantsForForm(formId: string) {
    setLoadingApplications(true);
    setSelectedApplicationIds([]);
    try {
      const res = await fetch(`/api/admin/messages?formId=${formId}`);
      const data = await res.json();
      if (data.applicants) {
        setFormApplicants(data.applicants);
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    }
    setLoadingApplications(false);
  }

  function handleFormChange(formId: string) {
    setSelectedFormId(formId);
    if (formId) {
      fetchApplicantsForForm(formId);
    } else {
      setFormApplicants([]);
    }
  }

  function toggleApplicationSelection(userId: string) {
    setSelectedApplicationIds((prev) =>
      prev.includes(userId) ? prev.filter((i) => i !== userId) : [...prev, userId]
    );
  }

  function selectAllSubmitted() {
    const submitted = formApplicants
      .filter((a) => a.submittedAt !== null)
      .map((a) => a.userId);
    setSelectedApplicationIds(submitted);
  }

  function selectAllNotSubmitted() {
    const notSubmitted = formApplicants
      .filter((a) => a.submittedAt === null)
      .map((a) => a.userId);
    setSelectedApplicationIds(notSubmitted);
  }

  function selectAll() {
    setSelectedApplicationIds(formApplicants.map((a) => a.userId));
  }

  async function sendEmails() {
    if (selectedApplicationIds.length === 0) {
      setError("Please select at least one applicant");
      return;
    }
    if (!emailSubject.trim() || !emailMessage.trim()) {
      setError("Please enter subject and message");
      return;
    }

    setSendingEmail(true);
    setError("");
    setEmailSuccess("");

    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientIds: selectedApplicationIds,
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send emails");
      }

      setEmailResults(data.results);
      setEmailSuccess(data.message);
      setSelectedApplicationIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send emails");
    }

    setSendingEmail(false);
  }

  const selectedCount = selectedApplicationIds.length;
  const selectedApplicationNames = formApplicants
    .filter((a) => selectedApplicationIds.includes(a.userId))
    .map((a) => a.name);

  const submittedCount = formApplicants.filter((a) => a.submittedAt !== null).length;
  const notSubmittedCount = formApplicants.filter((a) => a.submittedAt === null).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
          <p className="mt-1 text-gray-600">
            Create applicant accounts and manage registered fellowship applicants
          </p>
        </div>
        <Button onClick={openEmailModal} className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Compose Email
        </Button>
      </div>

      {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={createApplicant} className="card space-y-4">
        <h2 className="font-semibold">Create Applicant Account</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <p className="text-sm text-gray-500">
          Applicant will sign in at <span className="font-medium text-primary-600">/applicant</span>.
          View all credentials in{" "}
          <Link href="/admin/accounts" className="font-medium text-primary-600 underline">
            All Accounts
          </Link>
          .
        </p>
        <Button type="submit" loading={loading}>
          Create Applicant Account
        </Button>
      </form>

      <div className="card overflow-x-auto">
        <h2 className="mb-4 font-semibold">All Applicants ({applicants.length})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4">User ID</th>
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Email</th>
              <th className="pb-3 pr-4">Phone</th>
              <th className="pb-3 pr-4">Applications</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Registered</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((applicant) => (
              <tr key={applicant.id} className="border-b last:border-0">
                <td className="py-3 pr-4 font-medium">{applicant.userId}</td>
                <td className="py-3 pr-4">{applicant.name}</td>
                <td className="py-3 pr-4">
                  <Link href={`/admin/applicants/${applicant.id}`} className="text-primary-600 hover:underline">
                    {applicant.email}
                  </Link>
                </td>
                <td className="py-3 pr-4">{applicant.phone ?? "—"}</td>
                <td className="py-3 pr-4">
                  {applicant.applications.length === 0 ? (
                    "—"
                  ) : (
                    <div className="space-y-1">
                      {applicant.applications.map((app) => (
                        <div key={app.id} className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/applications/${app.id}`}
                            className="font-mono text-xs text-primary-600 hover:underline"
                          >
                            {app.applicationNumber}
                          </Link>
                          <StatusBadge status={app.status || "DRAFT"} />
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      applicant.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {applicant.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {new Date(applicant.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/applicants/${applicant.id}`}>
                      <Button type="button" variant="secondary" className="text-xs">
                        View details
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs"
                      onClick={() => toggleActive(applicant.id, applicant.isActive)}
                    >
                      {applicant.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs text-red-600 hover:text-red-700"
                      onClick={() => deleteApplicant(applicant.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {applicants.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500">
                  No applicants yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Email Compose Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-xl">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between border-b bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary-100 p-2">
                  <Mail className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Compose Email</h2>
                  <p className="text-sm text-gray-500">
                    {selectedFormId 
                      ? `${selectedCount} of ${formApplicants.length} applicants selected`
                      : "Select an application form to view applicants"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Step 1: Select Application Form */}
              <div className="mb-6">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-600">1</span>
                  Select Application Form
                </h3>
                
                <Select
                  value={selectedFormId}
                  onChange={(e) => handleFormChange(e.target.value)}
                  options={[
                    { value: "", label: "-- Select Application Form --" },
                    ...fellowshipForms.map((f) => ({
                      value: f.id,
                      label: `${f.name} - ${f.applicantCount} applicants`,
                    })),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Step 2: Applicant List with Selection */}
              {selectedFormId && (
                <div className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-600">2</span>
                      Select Applicants
                    </h3>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={selectAll}
                        className="text-xs text-primary-600 hover:underline"
                      >
                        Select All ({formApplicants.length})
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={selectAllSubmitted}
                        className="text-xs text-green-600 hover:underline"
                      >
                        Submitted ({submittedCount})
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={selectAllNotSubmitted}
                        className="text-xs text-yellow-600 hover:underline"
                      >
                        Not Submitted ({notSubmittedCount})
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => setSelectedApplicationIds([])}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {loadingApplicants ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : formApplicants.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-8 text-center text-gray-500">
                      No applicants found for this form
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left w-10"></th>
                            <th className="px-3 py-2 text-left">App ID</th>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Submission</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {formApplicants.map((app) => (
                            <tr 
                              key={app.id} 
                              className={`hover:bg-gray-50 cursor-pointer ${
                                selectedApplicationIds.includes(app.id) ? "bg-primary-50" : ""
                              }`}
                              onClick={() => toggleApplicationSelection(app.id)}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedApplicationIds.includes(app.id)}
                                  onChange={() => toggleApplicationSelection(app.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary-600"
                                />
                              </td>
                              <td className="px-3 py-2 font-mono text-xs">{app.applicationNumber}</td>
                              <td className="px-3 py-2">{app.name}</td>
                              <td className="px-3 py-2">{app.email}</td>
                              <td className="px-3 py-2">
                                <StatusBadge status={app.applicationStatus || "DRAFT"} />
                              </td>
                              <td className="px-3 py-2">
                                {app.submittedAt ? (
                                  <span className="text-xs text-green-600">✓ Submitted</span>
                                ) : (
                                  <span className="text-xs text-yellow-600">○ Not Submitted</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selectedCount > 0 && (
                    <div className="mt-2 rounded-lg bg-primary-50 p-2 text-sm">
                      <strong>{selectedCount}</strong> applicant(s) selected
                      <span className="mx-2 text-gray-400">|</span>
                      <span className="text-green-600">
                        {formApplicants.filter(a => selectedApplicationIds.includes(a.id) && a.submittedAt).length} submitted
                      </span>
                      <span className="mx-2 text-gray-400">|</span>
                      <span className="text-yellow-600">
                        {formApplicants.filter(a => selectedApplicationIds.includes(a.id) && !a.submittedAt).length} not submitted
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Compose Email */}
              {selectedFormId && (
                <div className="mb-6">
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-600">3</span>
                    Compose Email
                  </h3>

                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Left: Message Composition */}
                    <div className="space-y-4">
                      <Input
                        label="Subject *"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Enter email subject..."
                      />
                      
                      <Textarea
                        label="Message *"
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Dear {name},

Enter your message here...

Use {name} as placeholder for applicant name.
Use {applicationNumber} for application ID."
                        rows={10}
                      />
                    </div>

                    {/* Right: Preview & Results */}
                    <div className="space-y-4">
                      {/* Success/Error Messages */}
                      {emailSuccess && (
                        <div className="rounded-lg bg-green-50 p-3">
                          <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">{emailSuccess}</span>
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="rounded-lg bg-red-50 p-3">
                          <div className="flex items-center gap-2 text-red-800">
                            <XCircle className="h-5 w-5" />
                            <span className="font-medium">{error}</span>
                          </div>
                        </div>
                      )}

                      {/* Results */}
                      {emailResults.length > 0 && (
                        <div className="max-h-48 overflow-y-auto rounded-lg border">
                          <div className="bg-gray-50 border-b px-3 py-2">
                            <p className="text-sm font-medium">Send Results</p>
                          </div>
                          <div className="divide-y">
                            {emailResults.map((result, idx) => (
                              <div key={idx} className="flex items-center gap-3 px-3 py-2">
                                {result.ok ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{result.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{result.email}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Send Button */}
                      <Button
                        onClick={sendEmails}
                        loading={sendingEmail}
                        disabled={selectedCount === 0 || !emailSubject.trim() || !emailMessage.trim()}
                        className="w-full"
                      >
                        <Send className="h-4 w-4" />
                        Send Email to {selectedCount} Applicant{selectedCount !== 1 ? "s" : ""}
                      </Button>

                      <p className="text-xs text-gray-500 text-center">
                        Emails will be sent via ZeptoMail with &quot;[VGMF Fellowship]&quot; prefix
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
