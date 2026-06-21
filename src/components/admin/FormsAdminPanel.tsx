"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { slugifyFormName, isProtectedFormSlug } from "@/lib/form-slug";

interface FormField {
  id: string;
}

interface FormTemplateListItem {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
  fields: FormField[];
  _count?: { submissions: number; fields: number };
}

interface FormsAdminPanelProps {
  /** When true, shows a compact view suitable for the Website Updates tab */
  embedded?: boolean;
}

function formatScheduleStatus(form: FormTemplateListItem) {
  if (!form.isActive) return { label: "Disabled", className: "bg-gray-200 text-gray-700" };
  const now = Date.now();
  if (form.opensAt && new Date(form.opensAt).getTime() > now) {
    return { label: "Scheduled", className: "bg-amber-100 text-amber-800" };
  }
  if (form.closesAt && new Date(form.closesAt).getTime() < now) {
    return { label: "Closed", className: "bg-red-100 text-red-800" };
  }
  return { label: "Open", className: "bg-green-100 text-green-800" };
}

export function FormsAdminPanel({ embedded = false }: FormsAdminPanelProps) {
  const [forms, setForms] = useState<FormTemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", slug: "", description: "" });

  const loadForms = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/cms");
    const data = await res.json();
    setForms(data.forms || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  function onNameChange(name: string) {
    setNewForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug || slugifyFormName(name),
    }));
  }

  async function createForm() {
    const name = newForm.name.trim();
    const slug = (newForm.slug || slugifyFormName(name)).trim();
    if (!name || !slug) {
      setError("Form name and slug are required");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError("Slug must be lowercase letters, numbers, and hyphens only");
      return;
    }
    if (forms.some((f) => f.slug === slug)) {
      setError("A form with this slug already exists");
      return;
    }

    setCreating(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "form-template",
        data: {
          name,
          slug,
          description: newForm.description.trim() || null,
          isActive: true,
        },
      }),
    });

    setCreating(false);
    if (res.ok) {
      setMessage(`Form "${name}" created!`);
      setShowCreate(false);
      setNewForm({ name: "", slug: "", description: "" });
      await loadForms();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create form");
    }
  }

  async function toggleActive(form: FormTemplateListItem) {
    setError("");
    const res = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "form-template",
        data: {
          slug: form.slug,
          name: form.name,
          description: form.description,
          isActive: !form.isActive,
          opensAt: form.opensAt,
          closesAt: form.closesAt,
        },
      }),
    });
    if (res.ok) {
      await loadForms();
      setMessage(`Form "${form.name}" ${form.isActive ? "disabled" : "enabled"}`);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update form");
    }
  }

  async function deleteForm(form: FormTemplateListItem) {
    if (isProtectedFormSlug(form.slug)) return;
    if (!confirm(`Delete form "${form.name}"? This cannot be undone.`)) return;

    setError("");
    const res = await fetch(`/api/admin/cms?type=form-template&id=${form.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMessage(`Form "${form.name}" deleted`);
      await loadForms();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete form");
    }
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold">Application Forms</h1>
          <p className="text-gray-600">
            Create and manage fellowship application forms — fields, schedules, and availability for
            applicants.
          </p>
        </div>
      )}

      {embedded && (
        <div>
          <h2 className="font-semibold">Application Forms</h2>
          <p className="text-sm text-gray-600">
            Build application forms applicants fill out in the portal. Each form has its own fields
            and open/close schedule.
          </p>
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "+ Create Form"}
        </Button>
        {!embedded && (
          <Link
            href="/admin/website?tab=forms"
            className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Website Updates → Forms
          </Link>
        )}
      </div>

      {showCreate && (
        <div className="card space-y-4">
          <h3 className="font-semibold">New Form</h3>
          <Input
            label="Form name"
            value={newForm.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. VGMF Fellowship Application 2026"
          />
          <Input
            label="Slug (URL identifier)"
            value={newForm.slug}
            onChange={(e) =>
              setNewForm({ ...newForm, slug: slugifyFormName(e.target.value) })
            }
            placeholder="e.g. fellowship-application-2026"
          />
          <p className="text-xs text-gray-500">
            Applicants open forms from the portal using this slug. The main form is{" "}
            <code>fellowship-application</code>.
          </p>
          <Textarea
            label="Description (optional)"
            value={newForm.description}
            onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
          />
          <Button loading={creating} onClick={createForm}>
            Create Form
          </Button>
        </div>
      )}

      <div className="card">
        <h3 className="mb-4 font-semibold">All Forms ({forms.length})</h3>
        {loading ? (
          <p className="text-sm text-gray-500">Loading forms…</p>
        ) : forms.length === 0 ? (
          <p className="text-sm text-gray-500">
            No forms yet. Create your first form above.
          </p>
        ) : (
          <div className="space-y-3">
            {forms.map((form) => {
              const status = formatScheduleStatus(form);
              const fieldCount = form._count?.fields ?? form.fields?.length ?? 0;
              const submissionCount = form._count?.submissions ?? 0;
              const protectedForm = isProtectedFormSlug(form.slug);

              return (
                <div
                  key={form.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{form.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${status.className}`}>
                        {status.label}
                      </span>
                      {protectedForm && (
                        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-800">
                          Protected
                        </span>
                      )}
                    </div>
                    {form.description && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{form.description}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Slug: <code>{form.slug}</code> · {fieldCount} field
                      {fieldCount === 1 ? "" : "s"} · {submissionCount} submission
                      {submissionCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/forms/${form.slug}`}>
                      <Button variant="secondary" className="text-xs">
                        Edit Fields
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      className="text-xs"
                      onClick={() => toggleActive(form)}
                    >
                      {form.isActive ? "Disable" : "Enable"}
                    </Button>
                    {!protectedForm && (
                      <Button
                        variant="danger"
                        className="text-xs"
                        onClick={() => deleteForm(form)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {embedded && (
        <p className="text-xs text-gray-500">
          For full field editing and schedules, use{" "}
          <Link href="/admin/forms" className="font-medium text-primary-600 hover:underline">
            Admin → Forms
          </Link>
          .
        </p>
      )}
    </div>
  );
}
