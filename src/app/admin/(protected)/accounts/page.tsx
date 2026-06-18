"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumericId } from "@/lib/format-ids";

interface ApplicantApplication {
  id: string;
  applicationNumber: string;
  status: string;
}

interface Account {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  roleLabel: string;
  adminPassword: string | null;
  isActive: boolean;
  createdAt: string;
  loginPath: string;
  applications: ApplicantApplication[];
}

const ROLE_FILTERS = [
  { value: "ALL", label: "All accounts" },
  { value: "APPLICANT", label: "Applicants" },
  { value: "ADMIN", label: "Admins" },
  { value: "STAFF", label: "Staff" },
  { value: "FINANCE", label: "Finance" },
  { value: "COMMITTEE", label: "Reviewers" },
  { value: "TRUSTEE", label: "Trustees" },
];

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [revealedPasswordIds, setRevealedPasswordIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  function isPasswordVisible(accountId: string) {
    return showPasswords || revealedPasswordIds.has(accountId);
  }

  function togglePasswordVisibility(accountId: string) {
    setRevealedPasswordIds((current) => {
      const next = new Set(current);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  }

  function setAllPasswordsVisible(visible: boolean) {
    setShowPasswords(visible);
    if (visible) {
      setRevealedPasswordIds(new Set(accounts.map((account) => account.id)));
    } else {
      setRevealedPasswordIds(new Set());
    }
  }

  const load = useCallback((filter = roleFilter) => {
    const query = filter === "ALL" ? "" : `?role=${filter}`;
    fetch(`/api/admin/accounts${query}`)
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []));
  }, [roleFilter]);

  useEffect(() => {
    load(roleFilter);
  }, [load, roleFilter]);

  async function resetPassword(id: string) {
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/admin/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password: newPassword }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to reset password");
      return;
    }

    setResetTarget(null);
    setNewPassword("");
    setMessage("Password updated successfully");
    load();
  }

  async function toggleActive(id: string, isActive: boolean) {
    const res = await fetch("/api/admin/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });

    if (res.ok) load();
    else {
      const data = await res.json();
      setError(data.error || "Failed to update account");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Accounts</h1>
          <p className="mt-1 text-gray-600">
            View every portal account — applicants, staff, reviewers, trustees, and admins — with
            12-digit User IDs and login credentials
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="gap-2 text-sm"
          onClick={() => setAllPasswordsVisible(!showPasswords)}
        >
          {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showPasswords ? "Hide all passwords" : "Show all passwords"}
        </Button>
      </div>

      {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="card flex flex-wrap items-end gap-4">
        <div className="min-w-[220px]">
          <Select
            label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={ROLE_FILTERS}
          />
        </div>
        <p className="text-sm text-gray-500">
          New User IDs and Application Numbers are randomly generated 12-digit numbers.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-4 font-semibold">
          Accounts ({accounts.length})
        </h2>
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4">12-digit User ID</th>
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Email</th>
              <th className="pb-3 pr-4">Phone</th>
              <th className="pb-3 pr-4">Role</th>
              <th className="pb-3 pr-4">Password</th>
              <th className="pb-3 pr-4">Login</th>
              <th className="pb-3 pr-4">Applications</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-b align-top last:border-0">
                <td className="py-3 pr-4">
                  <p className="font-mono font-medium">{account.userId}</p>
                  {/^\d{12}$/.test(account.userId) && (
                    <p className="text-xs text-gray-500">{formatNumericId(account.userId)}</p>
                  )}
                </td>
                <td className="py-3 pr-4">{account.name}</td>
                <td className="py-3 pr-4">{account.email}</td>
                <td className="py-3 pr-4">{account.phone ?? "—"}</td>
                <td className="py-3 pr-4">{account.roleLabel}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0">
                      {isPasswordVisible(account.id) ? (
                        account.adminPassword ? (
                          <span className="break-all font-mono text-xs text-gray-900">
                            {account.adminPassword}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700">
                            Not on file
                            <span className="mt-0.5 block text-[11px] text-gray-500">
                              Use Reset password to store one
                            </span>
                          </span>
                        )
                      ) : (
                        <span className="font-mono text-xs text-gray-400">••••••••</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      aria-label={
                        isPasswordVisible(account.id) ? "Hide password" : "Show password"
                      }
                      onClick={() => togglePasswordVisibility(account.id)}
                    >
                      {isPasswordVisible(account.id) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-primary-600">
                  {account.loginPath}
                </td>
                <td className="py-3 pr-4">
                  {account.applications.length === 0 ? (
                    "—"
                  ) : (
                    <div className="space-y-1">
                      {account.applications.map((app) => (
                        <div key={app.id} className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs">{app.applicationNumber}</span>
                          {/^\d{12}$/.test(app.applicationNumber) && (
                            <span className="text-[10px] text-gray-400">
                              {formatNumericId(app.applicationNumber)}
                            </span>
                          )}
                          <StatusBadge status={app.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      account.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {account.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs"
                      onClick={() => toggleActive(account.id, account.isActive)}
                    >
                      {account.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    {resetTarget === account.id ? (
                      <div className="space-y-2">
                        <Input
                          label=""
                          type="password"
                          placeholder="New password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            className="text-xs"
                            loading={loading}
                            onClick={() => resetPassword(account.id)}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-xs"
                            onClick={() => {
                              setResetTarget(null);
                              setNewPassword("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-xs"
                        onClick={() => {
                          setResetTarget(account.id);
                          setNewPassword("");
                          setError("");
                        }}
                      >
                        Reset password
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={10} className="py-8 text-center text-gray-500">
                  No accounts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
