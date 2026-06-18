"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function VerificationCompleteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkingSession, setCheckingSession] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  const rawNext = searchParams.get("next");
  const nextPath =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/applicant/verification";
  const status =
    searchParams.get("status") ||
    searchParams.get("verificationSessionStatus") ||
    searchParams.get("verificationStatus") ||
    "completed";

  const normalizedStatus = status.toLowerCase();
  const isSuccess = ["approved", "completed", "in review", "in_review"].some((value) =>
    normalizedStatus.includes(value.replace("_", " "))
  );

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => {
        setSignedIn(res.ok);
        if (res.ok) {
          router.replace(nextPath);
        }
      })
      .finally(() => setCheckingSession(false));
  }, [nextPath, router]);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-gray-600">Finishing verification...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          {isSuccess ? "Verification complete" : "Verification finished"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Didit status: <strong>{status.replace(/_/g, " ")}</strong>
        </p>

        {isSuccess ? (
          <p className="mt-4 text-sm text-green-800">
            Your identity verification was submitted successfully. You can return to the applicant
            portal to continue your fellowship application.
          </p>
        ) : (
          <p className="mt-4 text-sm text-amber-900">
            Your verification session has ended. Sign in to the applicant portal to review your
            status or try again if needed.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {signedIn ? (
            <Button onClick={() => router.push(nextPath)}>Continue to applicant portal</Button>
          ) : (
            <>
              <Link href={`/applicant?next=${encodeURIComponent(nextPath)}`} className="btn-primary">
                Sign in to applicant portal
              </Link>
              <Link href="/" className="btn-secondary">
                Back to home
              </Link>
            </>
          )}
        </div>

        {!signedIn && (
          <p className="mt-4 text-xs text-gray-500">
            If you were already signed in on another tab, open that tab and refresh your application
            page — your verification result is already saved.
          </p>
        )}
      </div>
    </div>
  );
}
