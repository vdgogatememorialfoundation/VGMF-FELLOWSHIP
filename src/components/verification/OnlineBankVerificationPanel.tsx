"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Props {
  applicationId: string;
  onSuccess: (status: string) => void;
}

export function OnlineBankVerificationPanel({ applicationId, onSuccess }: Props) {
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{nameAtBank?: string; message?: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/verification/online/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber, ifsc, applicationId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || data.error || "Bank Verification failed");
      } else {
        setSuccessData(data);
        onSuccess("APPROVED");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="card space-y-4 rounded-lg border border-green-200 bg-green-50 p-6">
        <h2 className="text-lg font-semibold text-green-900">Bank Account Verified</h2>
        <div className="text-sm text-green-800">
          <p><strong>Name at Bank:</strong> {successData.nameAtBank}</p>
          <p><strong>Status:</strong> {successData.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-lg font-semibold text-gray-900">Bank Account Verification</h2>
      <p className="text-sm text-gray-600">
        Enter your bank account details for instant online verification via Reverse Penny Drop.
      </p>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Bank Account Number"
          required
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="e.g. 1234567890"
        />
        <Input
          label="IFSC Code"
          required
          value={ifsc}
          onChange={(e) => setIfsc(e.target.value.toUpperCase())}
          placeholder="e.g. SBIN0001234"
        />
        <Button type="submit" className="w-full" loading={loading}>
          Verify Bank Account
        </Button>
      </form>
    </div>
  );
}
