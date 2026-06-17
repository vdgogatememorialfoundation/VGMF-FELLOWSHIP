"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { AcceptanceLetterUpload } from "@/components/admin/AcceptanceLetterUpload";

type FellowshipRow = {
  id: string;
  fellowshipId: string;
  fellowName: string;
  projectTitle: string;
  sanctionedAmount: number;
  isActive: boolean;
  isCompleted: boolean;
  awardLetterPath: string | null;
  installments: Array<{ status: string }>;
};

export function AdminFellowshipsClient({ fellowships }: { fellowships: FellowshipRow[] }) {
  const [rows, setRows] = useState(fellowships);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fellowships</h1>
        <p className="mt-1 text-gray-600">
          Manage fellowships and upload acceptance letters for installment 1 release
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4">Fellowship ID</th>
              <th className="pb-3 pr-4">Fellow</th>
              <th className="pb-3 pr-4">Project</th>
              <th className="pb-3 pr-4">Amount</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Installments</th>
              <th className="pb-3">Acceptance Letter</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-b align-top last:border-0">
                <td className="py-3 pr-4 font-medium">{f.fellowshipId}</td>
                <td className="py-3 pr-4">{f.fellowName}</td>
                <td className="py-3 pr-4">{f.projectTitle}</td>
                <td className="py-3 pr-4">{formatCurrency(f.sanctionedAmount)}</td>
                <td className="py-3 pr-4">
                  {f.isCompleted ? "Completed" : f.isActive ? "Active" : "Inactive"}
                </td>
                <td className="py-3 pr-4">
                  {f.installments.filter((i) => i.status === "RELEASED").length}/
                  {f.installments.length} released
                </td>
                <td className="py-3">
                  {f.awardLetterPath ? (
                    <a
                      href={f.awardLetterPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 underline"
                    >
                      View letter
                    </a>
                  ) : (
                    <AcceptanceLetterUpload fellowshipId={f.id} />
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
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
