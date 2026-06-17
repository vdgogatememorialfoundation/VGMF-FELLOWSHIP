"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

interface FormField {
  id: string;
  section: string;
  label: string;
  fieldKey: string;
  fieldType: string;
  placeholder?: string | null;
  helpText?: string | null;
  required: boolean;
  options?: string | null;
}

export function DynamicFormFields({
  fields,
  values,
  onChange,
}: {
  fields: FormField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const sections = [...new Set(fields.map((f) => f.section))];

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section} className="space-y-4">
          <h2 className="border-b pb-2 text-lg font-semibold text-gray-900">{section}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields
              .filter((f) => f.section === section)
              .map((field) => {
                const opts = field.options
                  ? (JSON.parse(field.options) as string[]).map((o) => ({
                      value: o,
                      label: o,
                    }))
                  : [];

                if (field.fieldType === "TEXTAREA") {
                  return (
                    <div key={field.id} className="sm:col-span-2">
                      <Textarea
                        label={field.label}
                        value={values[field.fieldKey] || ""}
                        onChange={(e) => onChange(field.fieldKey, e.target.value)}
                        placeholder={field.placeholder || ""}
                        required={field.required}
                      />
                      {field.helpText && (
                        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
                      )}
                    </div>
                  );
                }

                if (field.fieldType === "SELECT" || field.fieldType === "RADIO") {
                  return (
                    <Select
                      key={field.id}
                      label={field.label}
                      value={values[field.fieldKey] || ""}
                      onChange={(e) => onChange(field.fieldKey, e.target.value)}
                      options={opts}
                      required={field.required}
                    />
                  );
                }

                const inputType =
                  field.fieldType === "EMAIL"
                    ? "email"
                    : field.fieldType === "PHONE"
                      ? "tel"
                      : field.fieldType === "NUMBER"
                        ? "number"
                        : field.fieldType === "DATE"
                          ? "date"
                          : "text";

                return (
                  <div key={field.id}>
                    <Input
                      label={field.label}
                      type={inputType}
                      value={values[field.fieldKey] || ""}
                      onChange={(e) => onChange(field.fieldKey, e.target.value)}
                      placeholder={field.placeholder || ""}
                      required={field.required}
                    />
                    {field.helpText && (
                      <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
