"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type OnlineIdentityVerificationPanelProps = {
  purpose: string;
  applicationId: string;
  title: string;
  description: string;
  verifiedAt: string | null;
  onStatusChange: (status: string) => void;
};

export function OnlineIdentityVerificationPanel({
  purpose,
  applicationId,
  title,
  description,
  verifiedAt,
  onStatusChange,
}: OnlineIdentityVerificationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startVerification = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/verification/online/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, applicationId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start verification.");
      }

      if (data.verificationUrl) {
        window.location.href = data.verificationUrl;
      } else {
        throw new Error("No verification URL returned.");
      }
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to start verification.");
    }
  };

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-gray-600">{description}</p>
      
      {verifiedAt ? (
        <div className="rounded-lg bg-green-50 p-4 text-green-800">
          Identity verified successfully on {new Date(verifiedAt).toLocaleString("en-IN")}.
        </div>
      ) : (
        <div>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <Button loading={loading} onClick={startVerification}>
            Start Online Verification
          </Button>
        </div>
      )}
    </div>
  );
}
