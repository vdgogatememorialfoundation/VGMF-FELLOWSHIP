"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { BUDGET_MAX } from "@/lib/utils";

type TrusteeApprovalActionsProps = {
  applicationId: string;
  budgetTotal?: number;
  onComplete: () => void;
};

export function TrusteeApprovalActions({
  applicationId,
  budgetTotal,
  onComplete,
}: TrusteeApprovalActionsProps) {
  const [remarks, setRemarks] = useState("");
  const [sanctionedAmount, setSanctionedAmount] = useState(
    String(budgetTotal && budgetTotal <= BUDGET_MAX ? Math.round(budgetTotal) : BUDGET_MAX)
  );
  const [duration, setDuration] = useState("12 months");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(approved: boolean) {
    setLoading(true);
    setError("");

    const res = await fetch("/api/trustee/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId,
        approved,
        remarks,
        sanctionedAmount: approved ? Number(sanctionedAmount) : undefined,
        duration: approved ? duration : undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to record decision");
      return;
    }

    onComplete();
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <Textarea
        label="Trustee remarks"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Notes for the Board of Trustees record"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={`Sanctioned amount (max ₹${BUDGET_MAX.toLocaleString("en-IN")})`}
          type="number"
          min={1}
          max={BUDGET_MAX}
          value={sanctionedAmount}
          onChange={(e) => setSanctionedAmount(e.target.value)}
        />
        <Input
          label="Fellowship duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g. 6 months or 12 months"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button loading={loading} onClick={() => submit(true)}>
          Approve Fellowship
        </Button>
        <Button variant="danger" loading={loading} onClick={() => submit(false)}>
          Reject
        </Button>
      </div>
    </div>
  );
}
