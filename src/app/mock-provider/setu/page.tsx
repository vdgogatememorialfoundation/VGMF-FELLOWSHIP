"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function MockSetuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(false);

  const handleSimulate = async (status: "SUCCESS" | "FAILED") => {
    setLoading(true);

    try {
      // Simulate Setu firing the webhook back to our server
      await fetch("/api/webhooks/setu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "EKYC_DATA",
          data: {
            id: sessionId,
            status,
            aadhaar: {
              name: "Mock Applicant",
              aadhaarNumber: "XXXX XXXX 1234",
              gender: "M",
              dateOfBirth: "1995-01-01",
            }
          }
        })
      });

      // Redirect back to the applicant verification page
      router.push("/applicant/verification");
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="card w-full max-w-md space-y-6 bg-white p-8">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">SetuHQ Mock eKYC</h1>
          <p className="mt-2 text-sm text-gray-500">
            Simulating Aadhaar verification for session: <code>{sessionId}</code>
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            loading={loading}
            onClick={() => handleSimulate("SUCCESS")}
          >
            Simulate Aadhaar Success
          </Button>

          <Button
            className="w-full"
            variant="secondary"
            loading={loading}
            onClick={() => handleSimulate("FAILED")}
          >
            Simulate Verification Failure
          </Button>
          
          <Button
            className="w-full"
            variant="secondary"
            loading={loading}
            onClick={() => router.push("/applicant/verification")}
          >
            Cancel & Return
          </Button>
        </div>
      </div>
    </div>
  );
}
