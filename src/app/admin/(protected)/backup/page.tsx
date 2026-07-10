"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Download,
  Database,
  FileJson,
  FileArchive,
  Loader2,
  CheckCircle2,
  X,
  Info,
  Shield,
  Clock,
  HardDrive,
} from "lucide-react";

export default function AdminBackupPage() {
  const [loading, setLoading] = useState(false);
  const [loadingJson, setLoadingJson] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function downloadBackup(format: "zip" | "json") {
    if (format === "json") {
      setLoadingJson(true);
    } else {
      setLoading(true);
    }
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/backup?format=${format}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate backup");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      const match = contentDisposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `vgmf_backup_${new Date().toISOString().split("T")[0]}.${format}`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setSuccess(`Backup downloaded successfully: ${filename}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download backup");
    }

    setLoading(false);
    setLoadingJson(false);
  }

  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Backup</h1>
          <p className="mt-1 text-gray-600">
            Download complete backup of all submitted applications
          </p>
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

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">Complete Application Backup</p>
            <p className="mt-1">
              This backup includes all submitted applications with complete data including:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Personal information and contact details</li>
              <li>Research proposals and budgets</li>
              <li>All submitted documents (metadata)</li>
              <li>Scoring data from all reviewers</li>
              <li>Interview schedules and feedback</li>
              <li>Fellowship details and installments</li>
              <li>Complete status history and audit trail</li>
              <li>All committee remarks and queries</li>
            </ul>
            <p className="mt-3 font-medium">
              Export Date: {currentDate}
            </p>
          </div>
        </div>
      </div>

      {/* Backup Options */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ZIP Backup */}
        <div className="card overflow-hidden">
          <div className="bg-primary-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <FileArchive className="h-10 w-10" />
              <div>
                <h2 className="text-xl font-semibold">Complete Backup (ZIP)</h2>
                <p className="text-sm text-white/80">All data in multiple formats</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Download a comprehensive ZIP archive containing:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span><strong>applications_complete.json</strong> - Full data in JSON format</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span><strong>applications_summary.csv</strong> - Quick overview for Excel</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span><strong>applications_detailed.csv</strong> - Complete application details</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span><strong>scores_all.csv</strong> - All reviewer scores</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span><strong>status_history.csv</strong> - Application workflow history</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span><strong>fellowships.csv</strong> - Fellowship details</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span><strong>interviews.csv</strong> - Interview schedules and feedback</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span><strong>documents_list.json</strong> - Document metadata</span>
                </li>
              </ul>
            </div>
            <div className="mt-6">
              <Button
                onClick={() => downloadBackup("zip")}
                loading={loading}
                className="w-full"
                size="lg"
              >
                <Download className="h-5 w-5" />
                Download Complete Backup (ZIP)
              </Button>
            </div>
          </div>
        </div>

        {/* JSON Backup */}
        <div className="card overflow-hidden">
          <div className="bg-purple-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <FileJson className="h-10 w-10" />
              <div>
                <h2 className="text-xl font-semibold">JSON Backup</h2>
                <p className="text-sm text-white/80">Complete data structure</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Download all application data in a single JSON file. This format is ideal for:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-600" />
                  <span>Data migration and transfer</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-600" />
                  <span>Importing into other systems</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-600" />
                  <span>Custom analysis and reporting</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-600" />
                  <span>Database restoration if needed</span>
                </li>
              </ul>
            </div>
            <div className="mt-6">
              <Button
                onClick={() => downloadBackup("json")}
                loading={loadingJson}
                variant="secondary"
                className="w-full"
                size="lg"
              >
                <Download className="h-5 w-5" />
                Download JSON Backup
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Storage Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Secure Backup</p>
              <p className="text-xs text-gray-500">All downloads are logged for audit</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Complete Data</p>
              <p className="text-xs text-gray-500">All submitted applications included</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Timestamped</p>
              <p className="text-xs text-gray-500">Export includes date in filename</p>
            </div>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="card bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <HardDrive className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-700" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold">Important Notes:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Only submitted applications are included in the backup (drafts are excluded)</li>
              <li>Document files are not included - only metadata (file names, sizes, etc.)</li>
              <li>All downloads are recorded in the audit log for compliance</li>
              <li>ZIP backup is recommended for comprehensive data preservation</li>
              <li>Store backups securely as they contain sensitive personal information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
