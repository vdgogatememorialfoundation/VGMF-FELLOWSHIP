"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { INSTALLMENT_REQUIREMENTS } from "@/lib/installment-requirements";

type Requirement = {
  key: string;
  label: string;
  type: string;
  source: string;
  satisfied: boolean;
  status?: string;
  filePath?: string | null;
  documentId?: string | null;
  detail?: string;
};

type InstallmentRow = {
  id: string;
  installmentNo: number;
  percentage: number;
  amount: number;
  status: string;
  releaseGate?: {
    ok: boolean;
    missing: string[];
    requirements: Requirement[];
  };
  fellowship: {
    fellowshipId: string;
    fellowName: string;
    application: { applicationNumber: string };
  };
};

export default function StaffFinancePage() {
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [transactionId, setTransactionId] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const reload = useCallback(() => {
    fetch("/api/staff/finance")
      .then((r) => r.json())
      .then((d) => setInstallments(d.installments || []));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function approveDocument(documentId: string) {
    const res = await fetch("/api/fellowship/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, status: "APPROVED" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "Failed to approve document");
      return;
    }
    setMessage("Document approved");
    reload();
  }

  async function releaseInstallment(id: string) {
    setLoading(id);
    setMessage("");

    const res = await fetch("/api/staff/finance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installmentId: id,
        action: "release",
        transactionId: transactionId[id],
        approvalNotes: notes[id],
      }),
    });

    const data = await res.json();
    setLoading(null);

    if (!res.ok) {
      setMessage(data.error || "Failed to release installment");
      return;
    }

    setMessage("Installment released successfully");
    reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finance — Installment Release</h1>
        <p className="mt-1 text-gray-600">
          Each installment requires specific documents before funds can be released
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="rounded-xl border bg-gray-50 p-4 text-sm">
            <p className="font-semibold text-gray-900">Installment {n}</p>
            <ul className="mt-2 list-inside list-disc text-gray-600">
              {(INSTALLMENT_REQUIREMENTS[n] ?? []).map((r) => (
                <li key={r.key}>{r.label}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {message && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{message}</div>
      )}

      <div className="space-y-4">
        {installments.map((inst) => {
          const gate = inst.releaseGate;
          const canRelease = gate?.ok && inst.status !== "RELEASED";

          return (
            <div key={inst.id} className="card space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-sm text-gray-500">{inst.fellowship.fellowshipId}</p>
                  <p className="font-semibold">{inst.fellowship.fellowName}</p>
                  <p className="text-sm text-gray-600">
                    Installment {inst.installmentNo} ({inst.percentage}%) —{" "}
                    {formatCurrency(inst.amount)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    inst.status === "RELEASED"
                      ? "bg-green-100 text-green-800"
                      : canRelease
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {inst.status}
                </span>
              </div>

              {gate && (
                <div className="rounded-lg border bg-white p-4">
                  <p className="mb-2 text-sm font-medium text-gray-900">Release checklist</p>
                  <ul className="space-y-2">
                    {gate.requirements.map((req) => (
                      <li key={req.key} className="flex items-start gap-2 text-sm">
                        <span className={req.satisfied ? "text-green-600" : "text-red-500"}>
                          {req.satisfied ? "✓" : "○"}
                        </span>
                        <div>
                          <span className="font-medium">{req.label}</span>
                          {req.filePath && (
                            <a
                              href={req.filePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-primary-600 underline"
                            >
                              View
                            </a>
                          )}
                          {req.detail && !req.satisfied && (
                            <p className="text-xs text-gray-500">{req.detail}</p>
                          )}
                          {req.documentId && req.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => approveDocument(req.documentId!)}
                              className="mt-1 text-xs font-medium text-primary-700 underline"
                            >
                              Approve document
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {!gate.ok && gate.missing.length > 0 && (
                    <p className="mt-2 text-xs text-red-600">
                      Pending: {gate.missing.join(", ")}
                    </p>
                  )}
                </div>
              )}

              {inst.status !== "RELEASED" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Transaction ID"
                    value={transactionId[inst.id] ?? ""}
                    onChange={(e) =>
                      setTransactionId({ ...transactionId, [inst.id]: e.target.value })
                    }
                  />
                  <Input
                    label="Release notes"
                    value={notes[inst.id] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [inst.id]: e.target.value })}
                  />
                </div>
              )}

              {inst.status !== "RELEASED" && (
                <Button
                  loading={loading === inst.id}
                  disabled={!canRelease}
                  onClick={() => releaseInstallment(inst.id)}
                >
                  {canRelease ? "Release Funds" : "Requirements incomplete"}
                </Button>
              )}
            </div>
          );
        })}

        {installments.length === 0 && (
          <div className="card py-12 text-center text-gray-500">
            No installments yet — created when trustee approves a fellowship
          </div>
        )}
      </div>
    </div>
  );
}
