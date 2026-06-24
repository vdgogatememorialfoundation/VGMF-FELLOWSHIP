"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface RolePermission {
  id: string;
  role: string;
  module: string;
  isVisible: boolean;
}

const MODULES_BY_ROLE = {
  STAFF: [
    { label: "Dashboard", href: "/staff" },
    { label: "Applications", href: "/staff/applications" },
    { label: "Support Tickets", href: "/staff/support" },
    { label: "Finance", href: "/staff/finance" },
    { label: "Reports", href: "/staff/reports" },
  ],
  FINANCE: [
    { label: "Dashboard", href: "/staff" },
    { label: "Applications", href: "/staff/applications" },
    { label: "Support Tickets", href: "/staff/support" },
    { label: "Finance", href: "/staff/finance" },
    { label: "Reports", href: "/staff/reports" },
  ],
  COMMITTEE: [
    { label: "Dashboard", href: "/reviewer" },
    { label: "Applications", href: "/reviewer/applications" },
    { label: "Rankings", href: "/reviewer/rankings" },
  ],
  TRUSTEE: [
    { label: "Dashboard", href: "/trustee" },
    { label: "Approvals", href: "/trustee/approvals" },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin" },
    { label: "Website Updates", href: "/admin/website" },
    { label: "Application Forms", href: "/admin/forms" },
    { label: "Support Tickets", href: "/admin/support" },
    { label: "All Accounts", href: "/admin/accounts" },
    { label: "Applications", href: "/admin/applications" },
    { label: "New Application", href: "/admin/applications/new" },
    { label: "Applicants", href: "/admin/applicants" },
    { label: "Portal Users", href: "/admin/users" },
    { label: "Fellowships", href: "/admin/fellowships" },
    { label: "Role Permissions", href: "/admin/permissions" },
    { label: "Reports", href: "/admin/reports" },
  ]
};

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPermissions = async () => {
    try {
      const res = await fetch("/api/admin/permissions");
      if (!res.ok) throw new Error("Failed to load permissions");
      const data = await res.json();
      setPermissions(data.permissions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const toggleVisibility = async (role: string, moduleHref: string, currentVisible: boolean) => {
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          module: moduleHref,
          isVisible: !currentVisible,
        }),
      });

      if (!res.ok) throw new Error("Failed to update visibility");
      
      // Update local state instead of reloading completely to feel snappier
      setPermissions((prev) => {
        const existing = prev.find((p) => p.role === role && p.module === moduleHref);
        if (existing) {
          return prev.map((p) =>
            p.role === role && p.module === moduleHref
              ? { ...p, isVisible: !currentVisible }
              : p
          );
        } else {
          // Add new entry
          return [
            ...prev,
            { id: "temp-" + Date.now(), role, module: moduleHref, isVisible: !currentVisible },
          ];
        }
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isVisible = (role: string, href: string) => {
    const perm = permissions.find((p) => p.role === role && p.module === href);
    // If not found in DB, default to true
    if (!perm) return true;
    return perm.isVisible;
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading permissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Role Permissions</h1>
        <p className="mt-1 text-gray-600">
          Configure which modules are visible to each role in their respective portals.
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-8">
        {(Object.entries(MODULES_BY_ROLE) as [string, { label: string; href: string }[]][]).map(([role, modules]) => (
          <div key={role} className="card overflow-x-auto">
            <h2 className="mb-4 text-lg font-semibold capitalize">{role} Modules</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Module Name</th>
                  <th className="pb-3 pr-4 font-medium">Path</th>
                  <th className="pb-3 pr-4 font-medium">Visibility</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((mod) => {
                  const visible = isVisible(role, mod.href);
                  return (
                    <tr key={mod.href} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-900">{mod.label}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-500">{mod.href}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            visible ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {visible ? "Visible" : "Hidden"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          className={`text-xs ${visible ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}`}
                          onClick={() => toggleVisibility(role, mod.href, visible)}
                        >
                          {visible ? "Hide Module" : "Show Module"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
