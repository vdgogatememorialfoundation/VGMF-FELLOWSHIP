"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { DocStatusBadge } from "@/components/ui/DocStatusBadge";
import { formatCurrency } from "@/lib/utils";
import { FELLOWSHIP_STAGE_LABELS } from "@/lib/lifecycle-workflow";
import { INSTALLMENT_REQUIREMENTS } from "@/lib/installment-requirements";

type FellowshipDoc = {
  id: string;
  type: string;
  installmentNo: number;
  fileName: string;
  filePath: string;
  status: string;
};

type Installment = {
  id: string;
  installmentNo: number;
  percentage: number;
  amount: number;
  status: string;
  transactionId: string | null;
};

type FellowshipData = {
  id: string;
  fellowshipId: string;
  fellowName: string;
  sanctionedAmount: number;
  duration: string;
  currentStage: string;
  awardLetterPath: string | null;
  agreementGeneratedAt: string | null;
  bankAccountHolder: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankBranch: string | null;
  bankSubmittedAt: string | null;
  bankVerifiedAt: string | null;
  installments: Installment[];
  fellowshipDocuments: FellowshipDoc[];
};

const UPLOADABLE_TYPES = [
  { type: "ACCEPTANCE_LETTER", label: "Acceptance Letter", installment: 1 },
  { type: "FELLOWSHIP_AGREEMENT", label: "Fellowship Agreement", installment: 1 },
  { type: "BANK_VERIFICATION", label: "Bank Verification", installment: 1 },
  { type: "PROGRESS_REPORT", label: "Progress Report", installment: 2 },
  { type: "UTILIZATION_STATEMENT", label: "Utilization Statement", installment: 2 },
  { type: "FINAL_REPORT", label: "Final Report", installment: 3 },
  { type: "PUBLICATION_MANUSCRIPT", label: "Publication Manuscript", installment: 3 },
  { type: "UTILIZATION_CERTIFICATE", label: "Utilization Certificate", installment: 3 },
];

export function AdminFellowshipPanel({
  applicationId,
  budgetTotal,
  onUpdated,
}: {
  applicationId: string;
  budgetTotal?: number;
  onUpdated?: () => void;
}) {
  const [fellowship, setFellowship] = useState<FellowshipData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sanctionedAmount, setSanctionedAmount] = useState(String(budgetTotal || ""));
  const [bankHolder, setBankHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [stage, setStage] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [midTermScore, setMidTermScore] = useState("75");
  const [midTermRemarks, setMidTermRemarks] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/fellowships?applicationId=${applicationId}`);
    const data = await res.json();
    const f = data.fellowship as FellowshipData | null;
    setFellowship(f);
    if (f) {
      setBankHolder(f.bankAccountHolder || f.fellowName || "");
      setBankName(f.bankName || "");
      setBankAccount(f.bankAccountNumber || "");
      setBankIfsc(f.bankIfsc || "");
      setBankBranch(f.bankBranch || "");
      setStage(f.currentStage);
    }
  }, [applicationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(body: Record<string, unknown>, successMsg: string) {
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/fellowships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Action failed");
      return;
    }
    setMessage(successMsg);
    await load();
    onUpdated?.();
  }

  async function createFellowship() {
    await runAction(
      {
        action: "create_fellowship",
        applicationId,
        sanctionedAmount: Number(sanctionedAmount) || budgetTotal,
        duration: "12 months",
      },
      "Fellowship created"
    );
  }

  async function generateAgreement() {
    if (!fellowship) return;
    await runAction(
      { action: "generate_agreement", fellowshipId: fellowship.id },
      "Agreement PDF generated"
    );
  }

  async function saveBankDetails() {
    if (!fellowship) return;
    await runAction(
      {
        action: "update_bank",
        fellowshipId: fellowship.id,
        accountHolder: bankHolder,
        bankName,
        accountNumber: bankAccount,
        ifsc: bankIfsc,
        branch: bankBranch,
      },
      "Bank details saved"
    );
  }

  async function verifyBank() {
    if (!fellowship) return;
    await runAction({ action: "verify_bank", fellowshipId: fellowship.id }, "Bank account verified");
  }

  async function updateStage() {
    if (!fellowship || !stage) return;
    await runAction(
      { action: "update_stage", fellowshipId: fellowship.id, stage },
      "Fellowship stage updated"
    );
  }

  async function releaseInstallment(installmentId: string) {
    await runAction(
      {
        action: "release_installment",
        installmentId,
        transactionId: transactionId || undefined,
      },
      "Installment released"
    );
  }

  async function uploadDoc(type: string, installmentNo: number, file: File) {
    if (!fellowship) return;
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("fellowshipId", fellowship.id);
    formData.append("installmentNo", String(installmentNo));
    formData.append("type", type);
    formData.append("file", file);
    const res = await fetch("/api/admin/fellowships", { method: "POST", body: formData });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Upload failed");
      return;
    }
    setMessage(`${type.replace(/_/g, " ")} uploaded`);
    await load();
    onUpdated?.();
  }

  async function approveDoc(documentId: string) {
    await runAction({ action: "approve_document", documentId, status: "APPROVED" }, "Document approved");
  }

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Fellowship Management</h2>
        <p className="mt-1 text-sm text-gray-600">
          Create fellowship, generate agreement, manage bank details, documents, and fund releases
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      {!fellowship ? (
        <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-5 space-y-4">
          <p className="text-sm text-gray-700">No fellowship record yet for this application.</p>
          <Input
            label="Sanctioned amount (₹)"
            type="number"
            value={sanctionedAmount}
            onChange={(e) => setSanctionedAmount(e.target.value)}
          />
          <Button loading={loading} onClick={createFellowship}>
            Create Fellowship & Generate Agreement
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Fellowship ID</p>
              <p className="font-mono font-semibold">{fellowship.fellowshipId}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Sanctioned</p>
              <p className="font-semibold">{formatCurrency(fellowship.sanctionedAmount)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Stage</p>
              <p className="font-semibold">
                {FELLOWSHIP_STAGE_LABELS[fellowship.currentStage] ?? fellowship.currentStage}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Duration</p>
              <p className="font-semibold">{fellowship.duration}</p>
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <h3 className="font-medium">Agreement</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" loading={loading} onClick={generateAgreement}>
                {fellowship.agreementGeneratedAt ? "Regenerate Agreement PDF" : "Generate Agreement PDF"}
              </Button>
              {fellowship.awardLetterPath && (
                <a
                  href={fellowship.awardLetterPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg border border-primary-200 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                >
                  View Agreement PDF
                </a>
              )}
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-4">
            <h3 className="font-medium">Bank Details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Account holder" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} />
              <Input label="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              <Input label="Account number" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
              <Input label="IFSC" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase())} />
              <Input label="Branch" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {fellowship.bankSubmittedAt && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">Submitted</span>
              )}
              {fellowship.bankVerifiedAt && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">Verified</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button loading={loading} onClick={saveBankDetails}>
                Save Bank Details
              </Button>
              <Button variant="secondary" loading={loading} onClick={verifyBank}>
                Mark Bank Verified
              </Button>
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-4">
            <h3 className="font-medium">Fund Installments</h3>
            <Input
              label="Transaction ID (for release)"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="UTR / reference number"
            />
            <div className="space-y-3">
              {fellowship.installments.map((inst) => (
                <div
                  key={inst.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      Installment {inst.installmentNo} — {inst.percentage}%
                    </p>
                    <p className="text-sm text-gray-600">{formatCurrency(inst.amount)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DocStatusBadge status={inst.status} />
                    {inst.status === "APPROVED" && (
                      <Button
                        variant="secondary"
                        className="text-xs"
                        loading={loading}
                        onClick={() => releaseInstallment(inst.id)}
                      >
                        Release
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {[1, 2, 3].map((instNo) => (
            <div key={instNo} className="rounded-xl border p-4 space-y-3">
              <h3 className="font-medium">Installment {instNo} Documents</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {(INSTALLMENT_REQUIREMENTS[instNo] || []).map((req) => (
                  <li key={req.key}>• {req.label}</li>
                ))}
              </ul>
              <div className="grid gap-3 sm:grid-cols-2">
                {UPLOADABLE_TYPES.filter((t) => t.installment === instNo).map((t) => {
                  const existing = fellowship.fellowshipDocuments.find(
                    (d) => d.type === t.type && d.installmentNo === instNo
                  );
                  return (
                    <div key={t.type} className="rounded-lg border p-3 space-y-2">
                      <p className="text-sm font-medium">{t.label}</p>
                      {existing ? (
                        <div className="space-y-1">
                          <a
                            href={existing.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-xs text-primary-600 hover:underline"
                          >
                            {existing.fileName}
                          </a>
                          <div className="flex flex-wrap gap-2">
                            <DocStatusBadge status={existing.status} />
                            {existing.status !== "APPROVED" && (
                              <Button
                                variant="secondary"
                                className="px-2 py-1 text-xs"
                                loading={loading}
                                onClick={() => approveDoc(existing.id)}
                              >
                                Approve
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Not uploaded</p>
                      )}
                      <label className="block cursor-pointer text-xs text-primary-700 hover:underline">
                        Upload / replace
                        <input
                          type="file"
                          accept=".pdf,application/pdf,image/*"
                          className="hidden"
                          disabled={loading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadDoc(t.type, instNo, file);
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-xl border p-4 space-y-4">
            <h3 className="font-medium">Review Actions</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Mid-term score"
                type="number"
                value={midTermScore}
                onChange={(e) => setMidTermScore(e.target.value)}
              />
              <Textarea
                label="Mid-term remarks"
                value={midTermRemarks}
                onChange={(e) => setMidTermRemarks(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                loading={loading}
                onClick={() =>
                  runAction(
                    {
                      action: "mid_term_approve",
                      fellowshipId: fellowship.id,
                      progressScore: Number(midTermScore),
                      remarks: midTermRemarks,
                    },
                    "Mid-term approved — Installment 2 unlocked"
                  )
                }
              >
                Approve Mid-Term
              </Button>
              <Button
                variant="secondary"
                loading={loading}
                onClick={() =>
                  runAction(
                    { action: "final_approve", fellowshipId: fellowship.id },
                    "Final submission approved — Installment 3 unlocked"
                  )
                }
              >
                Approve Final Submission
              </Button>
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <h3 className="font-medium">Override Fellowship Stage</h3>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              {Object.entries(FELLOWSHIP_STAGE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <Button variant="secondary" loading={loading} onClick={updateStage}>
              Update Stage
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
