"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { APPLICATION_STATUSES } from "@/lib/utils";
import { EmailMessagingPanel } from "@/components/admin/EmailMessagingPanel";

interface Application {
  id: string;
  applicationNumber: string;
  name: string;
  status: string;
  email: string;
  submittedAt: string | null;
  user: { profile: { name: string } | null };
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    const url = filter ? `/api/admin/applications?status=${filter}` : "/api/admin/applications";
    const res = await fetch(url);
    const data = await res.json();
    setApplications(data.applications || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadApplications();
  }, [filter, loadApplications]);

  async function updateStatus(applicationId: string, status: string) {
    const res = await fetch("/api/admin/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, status }),
    });
    if (res.ok) loadApplications();
  }

  async function deleteApplication(applicationId: string, applicationNumber: string) {
    const confirmed = window.confirm(
      `Permanently delete application ${applicationNumber}?\n\nThis removes all documents, reviews, fellowship records, and fund/installment data. This cannot be undone.`
    );
    if (!confirmed) return;

    const res = await fetch(
      `/api/admin/applications?applicationId=${encodeURIComponent(applicationId)}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    if (!res.ok) {
      window.alert(data.error || "Failed to delete application");
      return;
    }

    await loadApplications();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="mt-1 text-gray-600">Manage and review fellowship applications</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/applications/new"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + New Application
          </Link>
        </div>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          options={APPLICATION_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          className="w-48"
        />
      </div>

      <EmailMessagingPanel />

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="py-8 text-center text-gray-500">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 pr-4">Application #</th>
                <th className="pb-3 pr-4">Applicant</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Submitted</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <Link href={`/admin/applications/${app.id}`} className="font-medium text-primary-600 hover:underline">
                      {app.applicationNumber}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{app.user.profile?.name ?? app.name}</td>
                  <td className="py-3 pr-4">{app.email}</td>
                  <td className="py-3 pr-4"><StatusBadge status={app.status} /></td>
                  <td className="py-3 pr-4">
                    {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/applications/${app.id}`}
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >
                        View & edit
                      </Link>
                      <select
                        className="rounded border px-2 py-1 text-xs"
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <Button
                        variant="danger"
                        className="px-2 py-1 text-xs"
                        onClick={() => deleteApplication(app.id, app.applicationNumber)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">No applications found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
