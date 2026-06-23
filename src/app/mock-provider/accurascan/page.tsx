"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function AccurascanMockContent() {
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
      await fetch("/api/webhooks/accurascan", {
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
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600 mb-4">
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
                d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AccuraScan Mock SDK</h1>
          <p className="mt-2 text-center text-sm text-gray-500">
            This is a simulated verification screen. In a real integration, the user would scan their ID and face here using AccuraScan.
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

export default function AccurascanMockPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <AccurascanMockContent />
    </Suspense>
  );
}
