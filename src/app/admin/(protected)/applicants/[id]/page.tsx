"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { formatApplicationNumber } from "@/lib/application-number";
import { formatNumericId } from "@/lib/format-ids";

type ApplicantApplication = {
  id: string;
  applicationNumber: string;
  status: string;
  submittedAt?: string | null;
  createdAt?: string;
  researchProposal?: { projectTitle: string } | null;
  budget?: { total: number } | null;
  fellowship?: {
    fellowshipId: string;
    currentStage: string;
    sanctionedAmount: number;
  } | null;
};

type ApplicantDetail = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  loginPath: string;
  applications: ApplicantApplication[];
};

export default function AdminApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [applicant, setApplicant] = useState<ApplicantDetail | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: "", email: "", phone: "" });

  function loadApplicant() {
    setLoading(true);
    fetch(`/api/admin/applicants?id=${encodeURIComponent(id)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Applicant not found");
          setApplicant(null);
          return;
        }
        setApplicant(data.applicant);
        setAccountForm({
          name: data.applicant.name,
          email: data.applicant.email,
          phone: data.applicant.phone ?? "",
        });
      })
      .catch(() => setError("Unable to load applicant"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadApplicant();
  }, [id]);

  async function saveAccount() {
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/applicants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...accountForm }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to update applicant");
      return;
    }
    setMessage("Applicant account updated");
    loadApplicant();
  }

  if (loading) {
    return <p className="py-12 text-center text-gray-500">Loading applicant...</p>;
  }

  if (!applicant) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error || "Applicant not found"}</p>
        <Link href="/admin/applicants" className="text-primary-600 underline">
          Back to applicants
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/applicants" className="text-sm text-primary-600 hover:underline">
            ← All applicants
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{applicant.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            User ID: <span className="font-mono">{formatNumericId(applicant.userId)}</span>
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
            applicant.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
          }`}
        >
          {applicant.isActive ? "Active account" : "Inactive account"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium">{applicant.email}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Phone</p>
          <p className="font-medium">{applicant.phone ?? "—"}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Registered</p>
          <p className="font-medium">{new Date(applicant.createdAt).toLocaleDateString("en-IN")}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Login portal</p>
          <p className="font-medium">{applicant.loginPath}</p>
        </div>
      </div>

      {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form
        className="card space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void saveAccount();
        }}
      >
        <h2 className="font-semibold">Edit Applicant Account</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Full name" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} required />
          <Input label="Email" type="email" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} required />
          <Input label="Phone" value={accountForm.phone} onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })} />
        </div>
        <Button type="submit" loading={saving}>
          Save Account Details
        </Button>
      </form>

      <div className="card overflow-x-auto">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Applications ({applicant.applications.length})</h2>
          <Link href="/admin/accounts" className="text-sm text-primary-600 hover:underline">
            Manage account password
          </Link>
        </div>
        {applicant.applications.length === 0 ? (
          <p className="text-sm text-gray-500">No applications submitted yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 pr-4">Application #</th>
                <th className="pb-3 pr-4">Project</th>
                <th className="pb-3 pr-4">Budget</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Fellowship</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applicant.applications.map((app) => (
                <tr key={app.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-mono text-xs">
                    {formatApplicationNumber(app.applicationNumber)}
                  </td>
                  <td className="py-3 pr-4">{app.researchProposal?.projectTitle ?? "—"}</td>
                  <td className="py-3 pr-4">
                    {app.budget ? formatCurrency(app.budget.total) : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="py-3 pr-4 text-xs">
                    {app.fellowship ? (
                      <span className="font-mono">{formatApplicationNumber(app.fellowship.fellowshipId)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/admin/applications/${app.id}`}
                      className="font-medium text-primary-600 hover:underline"
                    >
                      View & edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
