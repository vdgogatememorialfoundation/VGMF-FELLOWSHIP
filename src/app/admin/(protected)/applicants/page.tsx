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

interface SendResult {
  id: string;
  name: string;
  email: string;
  ok: boolean;
  error?: string;
}

const TEMPLATE_OPTIONS = [
  { value: "", label: "Custom Message" },
  { value: "interview_invite", label: "Interview Invitation" },
  { value: "status_update", label: "Status Update" },
  { value: "document_request", label: "Document Request" },
  { value: "fellowship_offer", label: "Fellowship Offer" },
  { value: "general", label: "General Communication" },
];

const TEMPLATE_MESSAGES: Record<string, { subject: string; message: string }> = {
  interview_invite: {
    subject: "Interview Invitation - VGMF Fellowship",
    message: `We are pleased to invite you for an interview for your fellowship application.

Date: {{date}}
Time: {{time}}
Venue/Link: {{venue}}

Please ensure you are available at the scheduled time.

Best regards,
VGMF Team`,
  },
  status_update: {
    subject: "Application Status Update",
    message: `Dear {{name}},

We are writing to inform you about an update to your fellowship application.

Your application is currently under review. We will notify you of further updates.

For any queries, please use the support portal.

Best regards,
VGMF Team`,
  },
  document_request: {
    subject: "Document Request - Fellowship Application",
    message: `Dear {{name}},

We require additional documents for your fellowship application.

Please log in to the fellowship portal to view the list of required documents and submit them at your earliest convenience.

Best regards,
VGMF Team`,
  },
  fellowship_offer: {
    subject: "Fellowship Offer",
    message: `Dear {{name}},

Congratulations! We are pleased to offer you a fellowship under our program.

Please log in to the fellowship portal to review the agreement and complete the acceptance process.

Best regards,
VGMF Team`,
  },
  general: {
    subject: "Communication from VGMF Fellowship",
    message: `Dear {{name}},

We hope this message finds you well.

Best regards,
VGMF Fellowship Team`,
  },
};

export default function AdminApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
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
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
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
    setSelectedApplicants(applicants.map((a) => a.id));
    setEmailSubject("");
    setEmailMessage("");
    setSelectedTemplate("");
    setEmailSuccess("");
    setEmailResults([]);
    setShowEmailModal(true);
  }

  function handleTemplateChange(template: string) {
    setSelectedTemplate(template);
    if (template && TEMPLATE_MESSAGES[template]) {
      setEmailSubject(TEMPLATE_MESSAGES[template].subject);
      setEmailMessage(TEMPLATE_MESSAGES[template].message);
    }
  }

  function toggleApplicantSelection(id: string) {
    setSelectedApplicants((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function sendEmails() {
    if (selectedApplicants.length === 0) {
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
          recipientIds: selectedApplicants,
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
          template: selectedTemplate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send emails");
      }

      setEmailResults(data.results);
      setEmailSuccess(data.message);
      setSelectedApplicants([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send emails");
    }

    setSendingEmail(false);
  }

  const selectedCount = selectedApplicants.length;
  const selectedApplicantNames = applicants
    .filter((a) => selectedApplicants.includes(a.id))
    .map((a) => a.name);

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
                          <StatusBadge status={app.status} />
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
          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between border-b bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary-100 p-2">
                  <Mail className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Compose Email</h2>
                  <p className="text-sm text-gray-500">{selectedCount} recipient{selectedCount !== 1 ? "s" : ""} selected</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid lg:grid-cols-5 divide-x">
              {/* Left Side - Recipient Selection */}
              <div className="col-span-2 p-4">
                <div className="mb-4">
                  <h3 className="mb-2 flex items-center gap-2 font-medium">
                    <Users className="h-4 w-4" />
                    Select Recipients
                  </h3>
                  <div className="mb-2 flex gap-2">
                    <button
                      onClick={() => setSelectedApplicants(applicants.map((a) => a.id))}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Select All ({applicants.length})
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => setSelectedApplicants([])}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-80 space-y-2 overflow-y-auto pr-2">
                  {applicants.map((applicant) => (
                    <label
                      key={applicant.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        selectedApplicants.includes(applicant.id)
                          ? "border-primary-500 bg-primary-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedApplicants.includes(applicant.id)}
                        onChange={() => toggleApplicantSelection(applicant.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{applicant.name}</p>
                        <p className="text-sm text-gray-500 truncate">{applicant.email}</p>
                        {applicant.applications.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {applicant.applications.length} application(s)
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {selectedCount > 0 && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-3">
                    <p className="text-sm font-medium">Selected:</p>
                    <p className="text-xs text-gray-600 mt-1 max-h-20 overflow-y-auto">
                      {selectedApplicantNames.slice(0, 5).join(", ")}
                      {selectedApplicantNames.length > 5 && ` and ${selectedApplicantNames.length - 5} more...`}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Side - Compose */}
              <div className="col-span-3 p-4 space-y-4">
                {/* Template Selection */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Message Template</label>
                  <Select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    options={TEMPLATE_OPTIONS}
                  />
                </div>

                {/* Subject */}
                <Input
                  label="Subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject..."
                />

                {/* Message */}
                <div>
                  <Textarea
                    label="Message"
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Enter your message... Use {{name}} for applicant's name."
                    rows={8}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Placeholders: {"{{name}}"}
                  </p>
                </div>

                {/* Success Message */}
                {emailSuccess && (
                  <div className="rounded-lg bg-green-50 p-3">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">{emailSuccess}</span>
                    </div>
                  </div>
                )}

                {/* Results */}
                {emailResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border">
                    <div className="p-2 bg-gray-50 border-b">
                      <p className="text-sm font-medium">Send Results</p>
                    </div>
                    <div className="divide-y">
                      {emailResults.map((result, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2">
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

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="secondary" onClick={() => setShowEmailModal(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={sendEmails}
                    loading={sendingEmail}
                    disabled={selectedCount === 0 || !emailSubject.trim() || !emailMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                    Send to {selectedCount} Recipient{selectedCount !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
