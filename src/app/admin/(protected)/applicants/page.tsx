"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

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

export default function AdminApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      password: "",
      confirmPassword: "",
    });
    setMessage(
      `Applicant account created. User ID: ${data.applicant.userId}. They can log in at /applicant`
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
        <p className="mt-1 text-gray-600">
          Create applicant accounts and manage registered fellowship applicants
        </p>
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
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <div />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            required
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
                <td className="py-3 pr-4">{applicant.email}</td>
                <td className="py-3 pr-4">{applicant.phone ?? "—"}</td>
                <td className="py-3 pr-4">
                  {applicant.applications.length === 0 ? (
                    "—"
                  ) : (
                    <div className="space-y-1">
                      {applicant.applications.map((app) => (
                        <div key={app.id} className="flex items-center gap-2">
                          <span className="font-mono text-xs">{app.applicationNumber}</span>
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
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => toggleActive(applicant.id, applicant.isActive)}
                  >
                    {applicant.isActive ? "Deactivate" : "Activate"}
                  </Button>
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
    </div>
  );
}
