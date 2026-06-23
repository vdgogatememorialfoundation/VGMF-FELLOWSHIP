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
      // In a real implementation, this would call the backend to initiate a session
      // and redirect to the provider's SDK or hosted page.
      // For now, simulate success:
      setTimeout(() => {
        setLoading(false);
        onStatusChange("APPROVED");
        alert("Verification completed successfully (Simulated)");
      }, 2000);
    } catch (err) {
      setLoading(false);
      setError("Failed to start verification.");
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
