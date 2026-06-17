"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface PortalUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  roleLabel: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "STAFF", label: "Staff" },
  { value: "FINANCE", label: "Finance" },
  { value: "COMMITTEE", label: "Reviewer" },
  { value: "TRUSTEE", label: "Trustee" },
];

const LOGIN_PATHS: Record<string, string> = {
  ADMIN: "/admin",
  STAFF: "/staff",
  FINANCE: "/staff",
  COMMITTEE: "/reviewer",
  TRUSTEE: "/trustee",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "STAFF",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []));
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create user");
      return;
    }

    setForm({
      name: "",
      email: "",
      phone: "",
      role: "STAFF",
      password: "",
      confirmPassword: "",
    });
    setMessage(
      `Account created for ${data.user.name}. User ID: ${data.user.userId}. Login: ${data.user.loginPath}`
    );
    load();
  }

  async function toggleActive(id: string, isActive: boolean) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });

    if (res.ok) load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portal Users</h1>
        <p className="mt-1 text-gray-600">
          Create and manage admin, staff, finance, reviewer, and trustee accounts
        </p>
      </div>

      {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={createUser} className="card space-y-4">
        <h2 className="font-semibold">Create User Account</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={ROLE_OPTIONS}
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
          User will sign in at{" "}
          <span className="font-medium text-primary-600">
            {LOGIN_PATHS[form.role] || "/admin"}
          </span>
          . View all credentials in{" "}
          <Link href="/admin/accounts" className="font-medium text-primary-600 underline">
            All Accounts
          </Link>
          .
        </p>
        <Button type="submit" loading={loading}>
          Create User Account
        </Button>
      </form>

      <div className="card overflow-x-auto">
        <h2 className="mb-4 font-semibold">All Portal Users ({users.length})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4">User ID</th>
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Email</th>
              <th className="pb-3 pr-4">Role</th>
              <th className="pb-3 pr-4">Login</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0">
                <td className="py-3 pr-4 font-medium">{entry.userId}</td>
                <td className="py-3 pr-4">{entry.name}</td>
                <td className="py-3 pr-4">{entry.email}</td>
                <td className="py-3 pr-4">{entry.roleLabel}</td>
                <td className="py-3 pr-4 font-mono text-xs text-primary-600">
                  {LOGIN_PATHS[entry.role] || "—"}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      entry.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {entry.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => toggleActive(entry.id, entry.isActive)}
                  >
                    {entry.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
                  No portal users yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
