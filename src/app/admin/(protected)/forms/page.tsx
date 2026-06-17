"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FIELD_TYPES } from "@/lib/constants";

interface FormField {
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

interface FormTemplate {
  id: string;
  slug: string;
  name: string;
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

export default function FormBuilderPage() {
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [schedule, setSchedule] = useState({
    isActive: true,
    opensAt: "",
    closesAt: "",
    closedMessage: "",
  });
  const [fields, setFields] = useState<FormField[]>([]);
  const [newField, setNewField] = useState({
    section: "Personal Details",
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
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    fetch("/api/admin/cms")
      .then((r) => r.json())
      .then((d) => {
        const form = d.forms?.find(
          (f: FormTemplate) => f.slug === "fellowship-application"
        );
        if (form) {
          setTemplate(form);
          setFields(form.fields || []);
          setSchedule({
            isActive: form.isActive ?? true,
            opensAt: toDatetimeLocal(form.opensAt),
            closesAt: toDatetimeLocal(form.closesAt),
            closedMessage: form.closedMessage || "",
          });
        }
      });
  }, []);

  async function saveSchedule() {
    if (!template) return;
    setSavingSchedule(true);
    setMessage("");

    const res = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "form-template",
        data: {
          slug: template.slug,
          name: template.name,
          description: "Main fellowship application form",
          isActive: schedule.isActive,
          opensAt: schedule.opensAt ? new Date(schedule.opensAt).toISOString() : null,
          closesAt: schedule.closesAt ? new Date(schedule.closesAt).toISOString() : null,
          closedMessage: schedule.closedMessage.trim() || null,
        },
      }),
    });

    setSavingSchedule(false);
    if (res.ok) {
      setMessage("Application schedule saved!");
    } else {
      const data = await res.json();
      setMessage(data.error || "Failed to save schedule");
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
        section: "Personal Details",
        label: "",
        fieldKey: "",
        fieldType: "TEXT",
        placeholder: "",
        helpText: "",
        required: false,
        options: "",
        order: fields.length,
      });
      setMessage("Field added!");
    }
  }

  async function deleteField(id: string) {
    await fetch(`/api/admin/cms?type=form-field&id=${id}`, { method: "DELETE" });
    setFields(fields.filter((f) => f.id !== id));
  }

  const sections = [...new Set(fields.map((f) => f.section))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Form Builder</h1>
        <p className="text-gray-600">
          Customize fellowship application form fields and scheduling — changes apply instantly for
          applicants
        </p>
      </div>

      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}

      <div className="card space-y-4">
        <h2 className="font-semibold">Application Schedule</h2>
        <p className="text-sm text-gray-600">
          Control when applicants can open and submit the fellowship application form.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={schedule.isActive}
            onChange={(e) => setSchedule({ ...schedule, isActive: e.target.checked })}
          />
          Form enabled (uncheck to close applications immediately)
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
          label="Closed message (shown when applications are not open)"
          value={schedule.closedMessage}
          onChange={(e) => setSchedule({ ...schedule, closedMessage: e.target.value })}
          placeholder="Fellowship applications are currently closed. Please check official notices for updates."
        />
        <Button loading={savingSchedule} onClick={saveSchedule}>
          Save Schedule
        </Button>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Add New Field</h2>
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
            label="Field Key (unique, e.g. bams_college)"
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
        <h2 className="mb-4 font-semibold">Current Form Fields</h2>
        {sections.map((section) => (
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
        ))}
      </div>
    </div>
  );
}
