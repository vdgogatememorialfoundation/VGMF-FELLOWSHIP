"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { FELLOWSHIP_STAGE_LABELS } from "@/lib/lifecycle-workflow";

type FellowshipRow = {
  id: string;
  fellowshipId: string;
  fellowName: string;
  projectTitle: string;
  sanctionedAmount: number;
  currentStage: string;
  isActive: boolean;
  isCompleted: boolean;
  awardLetterPath: string | null;
  applicationId: string;
  installments: Array<{ status: string }>;
};

export function AdminFellowshipsClient({ fellowships }: { fellowships: FellowshipRow[] }) {
  const [rows] = useState(fellowships);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function generateAgreement(fellowshipId: string) {
    setLoadingId(fellowshipId);
    setMessage("");
    const res = await fetch("/api/admin/fellowships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_agreement", fellowshipId }),
    });
    const data = await res.json();
    setLoadingId(null);
    setMessage(res.ok ? "Agreement generated" : data.error || "Failed");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fellowships</h1>
        <p className="mt-1 text-gray-600">
          All awarded fellowships — open an application for full management controls
        </p>
      </div>

      {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4">Fellowship ID</th>
              <th className="pb-3 pr-4">Fellow</th>
              <th className="pb-3 pr-4">Stage</th>
              <th className="pb-3 pr-4">Amount</th>
              <th className="pb-3 pr-4">Installments</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-b align-top last:border-0">
                <td className="py-3 pr-4 font-medium">{f.fellowshipId}</td>
                <td className="py-3 pr-4">
                  <p>{f.fellowName}</p>
                  <p className="text-xs text-gray-500">{f.projectTitle}</p>
                </td>
                <td className="py-3 pr-4">
                  {FELLOWSHIP_STAGE_LABELS[f.currentStage] ?? f.currentStage}
                </td>
                <td className="py-3 pr-4">{formatCurrency(f.sanctionedAmount)}</td>
                <td className="py-3 pr-4">
                  {f.installments.filter((i) => i.status === "RELEASED").length}/{f.installments.length}{" "}
                  released
                </td>
                <td className="py-3">
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/admin/applications/${f.applicationId}`}
                      className="text-primary-600 hover:underline"
                    >
                      Manage application
                    </Link>
                    {f.awardLetterPath ? (
                      <a
                        href={f.awardLetterPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        View agreement
                      </a>
                    ) : (
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        loading={loadingId === f.id}
                        onClick={() => generateAgreement(f.id)}
                      >
                        Generate agreement
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No fellowships yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
