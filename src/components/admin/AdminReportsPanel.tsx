"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ADMIN_REPORTS, type AdminReportId } from "@/lib/admin-report-types";

export function AdminReportsPanel() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function downloadReport(reportId: AdminReportId, format: "csv" | "pdf") {
    const key = `${reportId}:${format}`;
    setLoadingKey(key);
    setError("");

    try {
      const response = await fetch(`/api/admin/reports/${reportId}?format=${format}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate report");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename =
        match?.[1] ||
        `vgmf_${reportId}_${new Date().toISOString().slice(0, 10)}.${format === "pdf" ? "pdf" : "csv"}`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download report");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-gray-600">Export reports to Excel/PDF</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_REPORTS.map((report) => (
          <div key={report.id} className="card">
            <h3 className="font-semibold">{report.title}</h3>
            <p className="mt-2 text-sm text-gray-600">Generate and download report</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="text-xs"
                loading={loadingKey === `${report.id}:csv`}
                onClick={() => downloadReport(report.id, "csv")}
              >
                Export Excel
              </Button>
              <Button
                variant="secondary"
                className="text-xs"
                loading={loadingKey === `${report.id}:pdf`}
                onClick={() => downloadReport(report.id, "pdf")}
              >
                Export PDF
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Excel exports download as CSV files that open directly in Microsoft Excel.
      </p>
    </div>
  );
}
