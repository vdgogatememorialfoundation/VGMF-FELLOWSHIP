"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { FILE_FIELD_DOCUMENT_TYPES } from "@/lib/form-validation";

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

const CHECKBOX_LINKS: Record<string, { href: string; label: string }> = {
  terms_accepted: { href: "/terms", label: "Terms & Conditions" },
  undertaking_accepted: { href: "/undertaking", label: "Undertaking" },
};

export function DynamicFormFields({
  fields,
  values,
  onChange,
  uploadedFiles = {},
  onFileSelect,
  fileUploading = null,
  readOnly = false,
}: {
  fields: FormField[];
  values: Record<string, string | boolean>;
  onChange: (key: string, value: string | boolean) => void;
  uploadedFiles?: Record<string, boolean>;
  onFileSelect?: (fieldKey: string, file: File) => void;
  fileUploading?: string | null;
  readOnly?: boolean;
}) {
  const [pincodeLookup, setPincodeLookup] = useState<"idle" | "loading" | "error">("idle");
  const sections = [...new Set(fields.map((f) => f.section))];

  async function handlePincodeChange(pincode: string) {
    onChange("pincode", pincode);
    setPincodeLookup("idle");

    if (!/^\d{6}$/.test(pincode)) return;

    setPincodeLookup("loading");
    try {
      const res = await fetch(`/api/pincode/${pincode}`);
      const data = await res.json();
      if (res.ok) {
        onChange("city", data.city);
        onChange("state", data.state);
        onChange("country", data.country || "India");
        setPincodeLookup("idle");
      } else {
        setPincodeLookup("error");
      }
    } catch {
      setPincodeLookup("error");
    }
  }

  function isChecked(key: string): boolean {
    const value = values[key];
    return value === true || value === "true";
  }

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

                if (field.fieldType === "CHECKBOX") {
                  const link = CHECKBOX_LINKS[field.fieldKey];
                  return (
                    <div key={field.id} className="sm:col-span-2">
                      <label className="flex items-start gap-3 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600"
                          checked={isChecked(field.fieldKey)}
                          disabled={readOnly}
                          onChange={(e) => onChange(field.fieldKey, e.target.checked)}
                          required={field.required}
                        />
                        <span>
                          {link ? (
                            <>
                              I have read and accept the{" "}
                              <Link
                                href={link.href}
                                target="_blank"
                                className="font-medium text-primary-700 underline"
                              >
                                {link.label}
                              </Link>
                            </>
                          ) : (
                            field.label
                          )}
                          {field.required && <span className="text-red-500"> *</span>}
                        </span>
                      </label>
                      {field.helpText && (
                        <p className="mt-1 pl-7 text-xs text-gray-500">{field.helpText}</p>
                      )}
                    </div>
                  );
                }

                if (field.fieldType === "FILE") {
                  const uploaded =
                    uploadedFiles[field.fieldKey] ||
                    values[`${field.fieldKey}_uploaded`] === true;
                  const docType = FILE_FIELD_DOCUMENT_TYPES[field.fieldKey];

                  return (
                    <div key={field.id} className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        {field.label}
                        {field.required && <span className="text-red-500"> *</span>}
                      </label>
                      {uploaded ? (
                        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                          <span>✓ File uploaded</span>
                          {!readOnly && onFileSelect && docType && (
                            <label className="ml-auto cursor-pointer text-primary-700 underline">
                              Replace
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                                disabled={fileUploading === field.fieldKey}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) onFileSelect(field.fieldKey, file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                            disabled={readOnly || !onFileSelect || fileUploading === field.fieldKey}
                            className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && onFileSelect) onFileSelect(field.fieldKey, file);
                            }}
                          />
                          {fileUploading === field.fieldKey && (
                            <p className="mt-1 text-xs text-gray-500">Uploading...</p>
                          )}
                        </div>
                      )}
                      {field.helpText && (
                        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
                      )}
                    </div>
                  );
                }

                if (field.fieldType === "TEXTAREA") {
                  return (
                    <div key={field.id} className="sm:col-span-2">
                      <Textarea
                        label={field.label}
                        value={String(values[field.fieldKey] || "")}
                        onChange={(e) => onChange(field.fieldKey, e.target.value)}
                        placeholder={field.placeholder || ""}
                        required={field.required}
                        disabled={readOnly}
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
                      value={String(values[field.fieldKey] || "")}
                      onChange={(e) => onChange(field.fieldKey, e.target.value)}
                      options={opts}
                      required={field.required}
                      disabled={readOnly}
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

                if (field.fieldKey === "pincode") {
                  return (
                    <div key={field.id}>
                      <Input
                        label={field.label}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={String(values[field.fieldKey] || "")}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                          void handlePincodeChange(digits);
                        }}
                        placeholder={field.placeholder || "6-digit pincode"}
                        required={field.required}
                        disabled={readOnly}
                      />
                      {pincodeLookup === "loading" && (
                        <p className="mt-1 text-xs text-primary-600">Looking up location...</p>
                      )}
                      {pincodeLookup === "error" && (
                        <p className="mt-1 text-xs text-amber-600">
                          Pincode not found — please enter city and state manually.
                        </p>
                      )}
                      {field.helpText && (
                        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
                      )}
                    </div>
                  );
                }

                const autoFilled =
                  ["city", "state", "country"].includes(field.fieldKey) &&
                  Boolean(values.pincode);

                return (
                  <div key={field.id}>
                    <Input
                      label={field.label}
                      type={inputType}
                      value={String(values[field.fieldKey] || "")}
                      onChange={(e) => onChange(field.fieldKey, e.target.value)}
                      placeholder={field.placeholder || ""}
                      required={field.required}
                      disabled={readOnly}
                    />
                    {autoFilled && field.fieldKey !== "country" && (
                      <p className="mt-1 text-xs text-gray-400">Auto-filled from pincode — edit if needed</p>
                    )}
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
