"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ADMIN_REPORTS, type AdminReportId } from "@/lib/admin-report-types";
import {
  Download,
  Mail,
  FileSpreadsheet,
  FileText,
  Loader2,
  X,
  CheckCircle2,
  Archive,
  Send,
  Info,
} from "lucide-react";

interface ReportInfo {
  id: string;
  title: string;
  description?: string;
}

export function AdminReportsPanel() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailRecipientName, setEmailRecipientName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailFormat, setEmailFormat] = useState<"csv" | "pdf">("csv");
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);

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

      setSuccess(`Downloaded: ${filename}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download report");
    } finally {
      setLoadingKey(null);
    }
  }

  async function downloadAllReports() {
    setLoadingBulk(true);
    setError("");

    try {
      const response = await fetch("/api/admin/reports/bulk", {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate bulk reports");
      }

      const blob = await response.blob();
      const filename = `vgmf_all_reports_${new Date().toISOString().slice(0, 10)}.zip`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setSuccess(`Downloaded all reports: ${filename}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download reports");
    } finally {
      setLoadingBulk(false);
    }
  }

  function openEmailModal() {
    setSelectedReports(ADMIN_REPORTS.map((r) => r.id));
    setEmailRecipient("");
    setEmailRecipientName("");
    setEmailSubject("");
    setEmailMessage("");
    setEmailResult(null);
    setShowEmailModal(true);
  }

  function toggleReportSelection(reportId: string) {
    setSelectedReports((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId]
    );
  }

  function selectAllReports() {
    setSelectedReports(ADMIN_REPORTS.map((r) => r.id));
  }

  function deselectAllReports() {
    setSelectedReports([]);
  }

  async function sendReportEmail() {
    if (!emailRecipient || selectedReports.length === 0) {
      setEmailResult({ success: false, message: "Please select reports and provide recipient email" });
      return;
    }

    setLoadingEmail(true);
    setEmailResult(null);

    try {
      const response = await fetch("/api/admin/reports/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reportIds: selectedReports,
          recipientEmail: emailRecipient,
          recipientName: emailRecipientName,
          subject: emailSubject,
          message: emailMessage,
          format: emailFormat,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEmailResult({ success: false, message: data.error || "Failed to send email" });
      } else {
        setEmailResult({ success: true, message: data.message });
      }
    } catch (err) {
      setEmailResult({ success: false, message: "Failed to send email" });
    } finally {
      setLoadingEmail(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-gray-600">Export reports to Excel/PDF and send via email</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={openEmailModal}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Email Reports
          </Button>
          <Button
            onClick={downloadAllReports}
            loading={loadingBulk}
            className="flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            Download All (ZIP)
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-800">
            <X className="h-5 w-5" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">{success}</span>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">Bulk Actions Available:</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>Download all reports as a ZIP file containing both CSV and PDF versions</li>
              <li>Email selected reports to any recipient with attachments</li>
              <li>All downloads and emails are logged for audit purposes</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_REPORTS.map((report) => (
          <div key={report.id} className="card">
            <h3 className="font-semibold">{report.title}</h3>
            {"description" in report && report.description && (
              <p className="mt-1 text-xs text-gray-500">{report.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="text-xs"
                loading={loadingKey === `${report.id}:csv`}
                onClick={() => downloadReport(report.id, "csv")}
              >
                <FileSpreadsheet className="h-3 w-3" />
                Excel
              </Button>
              <Button
                variant="secondary"
                className="text-xs"
                loading={loadingKey === `${report.id}:pdf`}
                onClick={() => downloadReport(report.id, "pdf")}
              >
                <FileText className="h-3 w-3" />
                PDF
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Excel exports download as CSV files that open directly in Microsoft Excel.
      </p>

      {/* Email Reports Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Email Reports</h2>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Select Reports */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <label className="label-field">Select Reports</label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllReports}
                    className="text-primary-600 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    type="button"
                    onClick={deselectAllReports}
                    className="text-primary-600 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                {ADMIN_REPORTS.map((report) => (
                  <label
                    key={report.id}
                    className="flex items-center gap-2 rounded p-1 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedReports.includes(report.id)}
                      onChange={() => toggleReportSelection(report.id)}
                      className="h-4 w-4 rounded text-primary-600"
                    />
                    <span className="text-sm">
                      {report.title}
                      {"description" in report && report.description && (
                        <span className="ml-2 text-xs text-gray-500">
                          - {report.description}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {selectedReports.length} report(s) selected
              </p>
            </div>

            {/* Format Selection */}
            <div className="mb-4">
              <label className="label-field">Attachment Format</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="emailFormat"
                    value="csv"
                    checked={emailFormat === "csv"}
                    onChange={() => setEmailFormat("csv")}
                    className="h-4 w-4 text-primary-600"
                  />
                  <span>CSV (Excel)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="emailFormat"
                    value="pdf"
                    checked={emailFormat === "pdf"}
                    onChange={() => setEmailFormat("pdf")}
                    className="h-4 w-4 text-primary-600"
                  />
                  <span>PDF</span>
                </label>
              </div>
            </div>

            {/* Recipient */}
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <Input
                label="Recipient Email *"
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="email@example.com"
                required
              />
              <Input
                label="Recipient Name"
                value={emailRecipientName}
                onChange={(e) => setEmailRecipientName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            {/* Subject */}
            <div className="mb-4">
              <Input
                label="Email Subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="VGMF Fellowship Reports - [Date]"
              />
            </div>

            {/* Message */}
            <div className="mb-6">
              <Textarea
                label="Message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Enter a message to include with the reports..."
                rows={4}
              />
            </div>

            {/* Result */}
            {emailResult && (
              <div
                className={`mb-4 rounded-lg p-3 ${
                  emailResult.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {emailResult.success ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                  <span>{emailResult.message}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowEmailModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={sendReportEmail}
                loading={loadingEmail}
                disabled={selectedReports.length === 0 || !emailRecipient}
              >
                <Send className="h-4 w-4" />
                Send Email
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
