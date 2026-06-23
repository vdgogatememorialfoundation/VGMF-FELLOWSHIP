"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function IdnormMockContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = searchParams.get("session");
  const [loading, setLoading] = useState(false);

  if (!session) {
    return <div className="p-8 text-center text-red-500">Invalid session.</div>;
  }

  const handleComplete = async (status: "verified" | "failed") => {
    setLoading(true);
    try {
      // Simulate webhook call to our backend
      await fetch("/api/webhooks/idnorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session,
          event: status === "verified" ? "verification.completed" : "verification.failed",
          timestamp: new Date().toISOString(),
        }),
      });

      // Redirect back to applicant portal
      setTimeout(() => {
        router.push("/verification/complete");
      }, 1000);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">IDNorm Mock SDK</h1>
          <p className="mt-2 text-center text-sm text-gray-500">
            This is a simulated verification screen. In a real integration, the user would scan their ID and face here using IDNorm.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-sm font-medium text-gray-600">Simulate Document Scan</p>
          </div>
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-sm font-medium text-gray-600">Simulate Face Liveness</p>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Button
            onClick={() => handleComplete("verified")}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? "Processing..." : "Simulate Success"}
          </Button>
          <Button
            onClick={() => handleComplete("failed")}
            disabled={loading}
            variant="outline"
            className="w-full text-red-600 hover:bg-red-50"
          >
            Simulate Failure
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function IdnormMockPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <IdnormMockContent />
    </Suspense>
  );
}
