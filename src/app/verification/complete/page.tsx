import { Suspense } from "react";
import { VerificationCompleteClient } from "@/components/verification/VerificationCompleteClient";

export default function VerificationCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <p className="text-gray-600">Loading...</p>
        </div>
      }
    >
      <VerificationCompleteClient />
    </Suspense>
  );
}
