"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatApplicationNumber } from "@/lib/application-number";
import {
  RULEBOOK_SECTION_8_DISBURSEMENT,
  RULEBOOK_SECTION_9_QUARTERLY,
} from "@/lib/rulebook-content";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InstallmentDocumentsPanel } from "@/components/fellowship/InstallmentDocumentsPanel";

type Installment = {
  id: string;
  installmentNo: number;
  percentage: number;
  amount: number;
  status: string;
  releasedAt: string | null;
  transactionId: string | null;
};

type FellowshipData = {
  id: string;
  fellowshipId: string;
  fellowName: string;
  projectTitle: string;
  sanctionedAmount: number;
  duration: string;
  startDate: string | null;
  endDate: string | null;
  currentStage: string;
  bankAccountHolder: string | null;
  bankName: string | null;
  bankIfsc: string | null;
  bankBranch: string | null;
  bankSubmittedAt: string | null;
  bankVerifiedAt: string | null;
  awardLetterPath: string | null;
  installments: Installment[];
  progressReports: Array<{ quarter: number; year: number; status: string; submittedAt: string }>;
  finalSubmission: { status: string; submittedAt: string } | null;
  financeRecords: { releasedAmount: number; balanceAmount: number } | null;
};

export default function ApplicantFellowshipPage() {
  const [data, setData] = useState<{
    fellowship: FellowshipData | null;
    applicationNumber: string;
    message?: string;
  } | null>(null);
  const [quarter, setQuarter] = useState("1");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [finalReport, setFinalReport] = useState<File | null>(null);
  const [manuscript, setManuscript] = useState<File | null>(null);
  const [utilizationCert, setUtilizationCert] = useState<File | null>(null);
  const [bankHolder, setBankHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const reload = useCallback(() => {
    fetch("/api/fellowship")
      .then((r) => r.json())
      .then((payload) => {
        setData(payload);
        if (payload.fellowship) {
          setBankHolder(payload.fellowship.bankAccountHolder || payload.fellowship.fellowName || "");
          setBankName(payload.fellowship.bankName || "");
          setBankIfsc(payload.fellowship.bankIfsc || "");
          setBankBranch(payload.fellowship.bankBranch || "");
        }
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!data) {
    return <p className="py-12 text-center text-gray-500">Loading fellowship...</p>;
  }

  if (!data.fellowship) {
    return (
      <div className="card py-12 text-center">
        <h1 className="text-xl font-semibold text-gray-900">My Fellowship</h1>
        <p className="mt-2 text-gray-600">
          {data.message ||
            "No active fellowship yet. This section opens after trustee approval and selection."}
        </p>
        <p className="mt-4 text-sm text-gray-500">
          If you were recently selected, refresh this page in a few minutes or check{" "}
          <Link href="/applicant/status" className="text-primary-700 underline">
            Application Tracking
          </Link>
          .
        </p>
      </div>
    );
  }

  const f = data.fellowship;

  async function submitProgressReport() {
    if (!reportFile) return;
    setLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("fellowshipId", f.id);
    formData.append("quarter", quarter);
    formData.append("year", year);
    formData.append("report", reportFile);

    const res = await fetch("/api/fellowship", { method: "POST", body: formData });
    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(result.error || "Failed to submit report");
      return;
    }

    setMessage("Quarterly progress report submitted");
    setReportFile(null);
    reload();
  }

  async function submitFinal() {
    if (!finalReport) return;
    setLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("fellowshipId", f.id);
    formData.append("finalReport", finalReport);
    if (manuscript) formData.append("manuscript", manuscript);
    if (utilizationCert) formData.append("utilizationCert", utilizationCert);

    const res = await fetch("/api/fellowship/final-submission", { method: "POST", body: formData });
    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(result.error || "Failed to submit final report");
      return;
    }

    setMessage("Final submission received");
    reload();
  }

  async function submitBankDetails() {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/fellowship/bank-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fellowshipId: f.id,
        accountHolder: bankHolder,
        bankName,
        accountNumber: bankAccount,
        ifsc: bankIfsc,
        branch: bankBranch,
      }),
    });
    const result = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(result.error || "Failed to save bank details");
      return;
    }
    setMessage("Bank details submitted for verification");
    reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Fellowship</h1>
        <p className="mt-1 font-mono text-sm text-gray-600">
          Fellowship {formatApplicationNumber(f.fellowshipId)} · Application{" "}
          {formatApplicationNumber(data.applicationNumber)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">Sanctioned Amount</p>
          <p className="text-2xl font-bold text-primary-600">{formatCurrency(f.sanctionedAmount)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Duration</p>
          <p className="text-xl font-semibold">{f.duration}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Released / Balance</p>
          <p className="text-xl font-semibold">
            {formatCurrency(f.financeRecords?.releasedAmount ?? 0)} /{" "}
            {formatCurrency(f.financeRecords?.balanceAmount ?? f.sanctionedAmount)}
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">Fund Installments (40% / 40% / 20%)</h2>
        <div className="space-y-3">
          {f.installments.map((inst) => (
            <div
              key={inst.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">
                  Installment {inst.installmentNo} — {inst.percentage}%
                </p>
                <p className="text-sm text-gray-600">{formatCurrency(inst.amount)}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  inst.status === "RELEASED"
                    ? "bg-green-100 text-green-800"
                    : inst.status === "APPROVED"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {inst.status.replace(/_/g, " ")}
              </span>
              {inst.releasedAt && (
                <p className="text-xs text-gray-500">Released {formatDate(inst.releasedAt)}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {f.awardLetterPath && (
        <div className="card">
          <h2 className="mb-2 font-semibold">Fellowship Agreement</h2>
          <p className="text-sm text-gray-600">
            Auto-generated when your fellowship was awarded. Review and keep a copy for your records.
          </p>
          <a
            href={f.awardLetterPath}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline"
          >
            View Fellowship Agreement (PDF)
          </a>
        </div>
      )}

      <div id="bank-details" className="card space-y-4">
        <h2 className="font-semibold">Bank Details</h2>
        <p className="text-sm text-gray-600">
          Required for fund transfer. Also upload bank verification proof under Installment 1 documents.
        </p>
        {f.bankVerifiedAt ? (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
            Bank account verified on {formatDate(f.bankVerifiedAt)}
          </p>
        ) : f.bankSubmittedAt ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Bank details submitted on {formatDate(f.bankSubmittedAt)} — awaiting Foundation verification
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Account holder name" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} required />
          <Input label="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
          <Input
            label="Account number"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            required={!f.bankSubmittedAt}
            placeholder={f.bankSubmittedAt ? "Re-enter to update" : ""}
          />
          <Input label="IFSC code" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase())} required />
          <Input label="Branch (optional)" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} />
        </div>
        <Button loading={loading} onClick={submitBankDetails}>
          {f.bankSubmittedAt ? "Update Bank Details" : "Submit Bank Details"}
        </Button>
      </div>

      <div id="installment-1">
        <InstallmentDocumentsPanel
          fellowshipId={f.id}
          installmentNo={1}
          onUploaded={reload}
        />
      </div>

      <div id="installment-2">
        <InstallmentDocumentsPanel
          fellowshipId={f.id}
          installmentNo={2}
          onUploaded={reload}
        />
      </div>

      <InstallmentDocumentsPanel
        fellowshipId={f.id}
        installmentNo={3}
        onUploaded={reload}
      />

      <div id="quarterly-reports" className="card space-y-4">
        <h2 className="font-semibold">Quarterly Progress Report</h2>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-ink-soft">Rulebook §8:</span> {RULEBOOK_SECTION_8_DISBURSEMENT}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-ink-soft">Rulebook §9:</span> {RULEBOOK_SECTION_9_QUARTERLY}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Quarter (1–4)"
            type="number"
            min={1}
            max={4}
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
          />
          <Input
            label="Year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Report file (PDF)</label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="block w-full text-sm"
              onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <Button loading={loading} onClick={submitProgressReport}>
          Submit Progress Report
        </Button>
      </div>

      <div id="final-submission" className="card space-y-4">
        <h2 className="font-semibold">Final Submission</h2>
        <p className="text-sm text-gray-600">
          Final report, publication-ready manuscript, and utilization certificate (Rulebook §9.6–9.7)
        </p>
        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Final Report *</label>
            <input type="file" accept=".pdf" onChange={(e) => setFinalReport(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Manuscript</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setManuscript(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Utilization Certificate</label>
            <input type="file" accept=".pdf" onChange={(e) => setUtilizationCert(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <Button loading={loading} onClick={submitFinal}>
          Submit Final Report
        </Button>
      </div>

      {f.progressReports.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Submitted Reports</h2>
          {f.progressReports.map((r, i) => (
            <div key={i} className="border-b py-2 text-sm last:border-0">
              Q{r.quarter} {r.year} — {r.status} ({formatDate(r.submittedAt)})
            </div>
          ))}
        </div>
      )}

      {message && (
        <div
          className={`rounded-lg p-3 text-sm ${
            message.toLowerCase().includes("fail") || message.toLowerCase().includes("error")
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Publication acknowledgment:</strong> &ldquo;This research was supported by Vd. Gogate
        Memorial Foundation, Pune under the Viddhakarma Research Fellowship.&rdquo;
      </div>
    </div>
  );
}
