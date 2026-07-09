"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FIELD_TYPES } from "@/lib/constants";
import { isProtectedFormSlug } from "@/lib/form-slug";
import { EmailMessagingPanel } from "@/components/admin/EmailMessagingPanel";

export interface FormField {
  id: string;
  section: string;
  label: string;
  fieldKey: string;
  fieldType: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string;
  order: number;
  isActive: boolean;
}

export interface FormTemplate {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
  closedMessage?: string | null;
  fields: FormField[];
}

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FormBuilderEditorProps {
  slug: string;
}

export function FormBuilderEditor({ slug }: FormBuilderEditorProps) {
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [formMeta, setFormMeta] = useState({ name: "", description: "" });
  const [schedule, setSchedule] = useState({
    isActive: true,
    opensAt: "",
    closesAt: "",
    closedMessage: "",
  });
  const [fields, setFields] = useState<FormField[]>([]);
  const [newField, setNewField] = useState({
    section: "General",
    label: "",
    fieldKey: "",
    fieldType: "TEXT",
    placeholder: "",
    helpText: "",
    required: false,
    options: "",
    order: 0,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [activeTab, setActiveTab] = useState<"fields" | "submissions">("fields");

  const loadForm = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/cms");
    const data = await res.json();
    const form = data.forms?.find((f: FormTemplate) => f.slug === slug);
    if (!form) {
      setError("Form not found");
      setTemplate(null);
      setLoading(false);
      return;
    }
    setTemplate(form);
    setFormMeta({
      name: form.name || "",
      description: form.description || "",
    });
    setFields(form.fields || []);
    setSchedule({
      isActive: form.isActive ?? true,
      opensAt: toDatetimeLocal(form.opensAt),
      closesAt: toDatetimeLocal(form.closesAt),
      closedMessage: form.closedMessage || "",
    });
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void loadForm();
  }, [loadForm]);

  async function saveMeta() {
    if (!template) return;
    setSavingMeta(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "form-template",
        data: {
          slug: template.slug,
          name: formMeta.name.trim() || template.name,
          description: formMeta.description.trim() || null,
          isActive: schedule.isActive,
          opensAt: schedule.opensAt ? new Date(schedule.opensAt).toISOString() : null,
          closesAt: schedule.closesAt ? new Date(schedule.closesAt).toISOString() : null,
          closedMessage: schedule.closedMessage.trim() || null,
        },
      }),
    });

    setSavingMeta(false);
    if (res.ok) {
      setMessage("Form details saved!");
      void loadForm();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save form details");
    }
  }

  async function saveSchedule() {
    if (!template) return;
    setSavingSchedule(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "form-template",
        data: {
          slug: template.slug,
          name: formMeta.name.trim() || template.name,
          description: formMeta.description.trim() || null,
          isActive: schedule.isActive,
          opensAt: schedule.opensAt ? new Date(schedule.opensAt).toISOString() : null,
          closesAt: schedule.closesAt ? new Date(schedule.closesAt).toISOString() : null,
          closedMessage: schedule.closedMessage.trim() || null,
        },
      }),
    });

    setSavingSchedule(false);
    if (res.ok) {
      setMessage("Schedule saved!");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save schedule");
    }
  }

  async function addField() {
    if (!template || !newField.label || !newField.fieldKey) return;

    const res = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "form-field",
        data: {
          formTemplateId: template.id,
          ...newField,
          options: newField.options
            ? JSON.stringify(newField.options.split(",").map((s) => s.trim()))
            : null,
          isActive: true,
        },
      }),
    });

    if (res.ok) {
      const { field } = await res.json();
      setFields([...fields, field]);
      setNewField({
        section: newField.section,
        label: "",
        fieldKey: "",
        fieldType: "TEXT",
        placeholder: "",
        helpText: "",
        required: false,
        options: "",
        order: fields.length + 1,
      });
      setMessage("Field added!");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add field");
    }
  }

  async function deleteField(id: string) {
    await fetch(`/api/admin/cms?type=form-field&id=${id}`, { method: "DELETE" });
    setFields(fields.filter((f) => f.id !== id));
    setMessage("Field removed");
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading form…</p>;
  }

  if (!template) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error || "Form not found"}</p>
        <Link href="/admin/forms" className="text-sm font-medium text-primary-600 hover:underline">
          ← Back to all forms
        </Link>
      </div>
    );
  }

  const sections = [...new Set(fields.map((f) => f.section))];
  const isFellowship = isProtectedFormSlug(template.slug);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/forms" className="text-sm font-medium text-primary-600 hover:underline">
            ← All forms
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{template.name}</h1>
          <p className="text-sm text-gray-600">
            Slug: <code className="rounded bg-gray-100 px-1">{template.slug}</code>
            {isFellowship && (
              <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-800">
                Main application form
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab("fields")}
            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
              activeTab === "fields"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Fields & Settings
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
              activeTab === "submissions"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Submissions & Email
          </button>
        </nav>
      </div>

      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {activeTab === "submissions" ? (
        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-4 font-semibold">Form Submissions</h2>
            <p className="text-sm text-gray-600">
              View and manage submissions for this form. Use the email feature below to send
              notifications to applicants who have submitted this form.
            </p>
          </div>
          <EmailMessagingPanel
            formTemplateId={template.id}
            formName={template.name}
          />
        </div>
      ) : (
        <>
          <div className="card space-y-4">
            <h2 className="font-semibold">Form Details</h2>
        <Input
          label="Form name"
          value={formMeta.name}
          onChange={(e) => setFormMeta({ ...formMeta, name: e.target.value })}
        />
        <Textarea
          label="Description (optional)"
          value={formMeta.description}
          onChange={(e) => setFormMeta({ ...formMeta, description: e.target.value })}
          placeholder="Shown to admins; applicants see this on the form page when provided."
        />
        <Button loading={savingMeta} onClick={saveMeta}>
          Save Details
        </Button>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Schedule & Availability</h2>
        <p className="text-sm text-gray-600">
          Control when this form is open for submissions.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={schedule.isActive}
            onChange={(e) => setSchedule({ ...schedule, isActive: e.target.checked })}
          />
          Form enabled (uncheck to close immediately)
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Opens at"
            type="datetime-local"
            value={schedule.opensAt}
            onChange={(e) => setSchedule({ ...schedule, opensAt: e.target.value })}
          />
          <Input
            label="Closes at"
            type="datetime-local"
            value={schedule.closesAt}
            onChange={(e) => setSchedule({ ...schedule, closesAt: e.target.value })}
          />
        </div>
        <Textarea
          label="Closed message"
          value={schedule.closedMessage}
          onChange={(e) => setSchedule({ ...schedule, closedMessage: e.target.value })}
          placeholder="This form is currently closed. Please check back later."
        />
        <Button loading={savingSchedule} onClick={saveSchedule}>
          Save Schedule
        </Button>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Add Field</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Section"
            value={newField.section}
            onChange={(e) => setNewField({ ...newField, section: e.target.value })}
          />
          <Input
            label="Field Label"
            value={newField.label}
            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
          />
          <Input
            label="Field Key (unique, e.g. college_name)"
            value={newField.fieldKey}
            onChange={(e) =>
              setNewField({ ...newField, fieldKey: e.target.value.replace(/\s/g, "_") })
            }
          />
          <Select
            label="Field Type"
            value={newField.fieldType}
            onChange={(e) => setNewField({ ...newField, fieldType: e.target.value })}
            options={FIELD_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Input
            label="Placeholder"
            value={newField.placeholder}
            onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
          />
          <Input
            label="Order"
            type="number"
            value={newField.order}
            onChange={(e) => setNewField({ ...newField, order: Number(e.target.value) })}
          />
        </div>
        <Textarea
          label="Help Text"
          value={newField.helpText}
          onChange={(e) => setNewField({ ...newField, helpText: e.target.value })}
        />
        <Input
          label="Options (comma-separated, for dropdown/radio)"
          value={newField.options}
          onChange={(e) => setNewField({ ...newField, options: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={newField.required}
            onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
          />
          Required field
        </label>
        <Button onClick={addField}>Add Field</Button>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">Fields ({fields.length})</h2>
        {fields.length === 0 ? (
          <p className="text-sm text-gray-500">No fields yet. Add your first field above.</p>
        ) : (
          sections.map((section) => (
            <div key={section} className="mb-6">
              <h3 className="mb-2 font-medium text-primary-700">{section}</h3>
              <div className="space-y-2">
                {fields
                  .filter((f) => f.section === section)
                  .sort((a, b) => a.order - b.order)
                  .map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{f.label}</span>
                        <span className="ml-2 text-gray-500">
                          ({f.fieldType}) {f.required && "*"}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">{f.fieldKey}</span>
                      </div>
                      <Button
                        variant="danger"
                        className="px-2 py-1 text-xs"
                        onClick={() => deleteField(f.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
        </>
      )}
    </div>
  );
}
