"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DigioVerificationPanel } from "@/components/verification/DigioVerificationPanel";
import { IdentityVerificationTracker } from "@/components/verification/IdentityVerificationTracker";
import { formatApplicationNumber } from "@/lib/application-number";

type ApplicationSummary = {
  id: string;
  applicationNumber: string;
  status: string;
  name: string;
  identityVerificationStatus: string;
  identityVerifiedAt: string | null;
};

export default function ApplicantVerificationPage() {
  const [application, setApplication] = useState<ApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((data) => {
        const apps = (data.applications ?? []) as ApplicationSummary[];
        const active =
          apps.find((app) => !["DRAFT", "INCOMPLETE", "WITHDRAWN", "REJECTED"].includes(app.status)) ??
          apps[0] ??
          null;
        setApplication(active);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="py-12 text-center text-gray-500">Loading verification...</p>;
  }

  if (!application) {
    return (
      <div className="card py-12 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Identity Verification</h1>
        <p className="mt-2 text-gray-600">Submit your fellowship application before starting verification.</p>
        <Link href="/applicant/forms" className="mt-4 inline-block text-primary-700 underline">
          Go to application forms
        </Link>
      </div>
    );
  }

  const showPanel = ["SUBMITTED", "SCRUTINY", "QUERY_RAISED", "QUERY_RESPONDED"].includes(
    application.status
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Identity Verification</h1>
        <p className="mt-1 font-mono text-sm text-gray-600">
          Application {formatApplicationNumber(application.applicationNumber)}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Complete secure online identity verification during document scrutiny. Have your government ID
          ready and ensure good lighting for the camera check.
        </p>
      </div>

      {showPanel ? (
        <DigioVerificationPanel
          purpose="APPLICANT_IDENTITY"
          applicationId={application.id}
          title="Applicant identity verification"
          description="Verify your name and photo against your uploaded application details. This step is required before the Foundation can approve your documents when Digio is enabled."
          verifiedAt={application.identityVerifiedAt}
          onStatusChange={(status) =>
            setApplication((prev) =>
              prev ? { ...prev, identityVerificationStatus: status } : prev
            )
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            Identity verification is available when your application is under document scrutiny. Current
            status: <strong>{application.status.replace(/_/g, " ")}</strong>.
            {application.identityVerificationStatus === "APPROVED" && application.identityVerifiedAt && (
              <p className="mt-2 text-green-800">
                Identity verified on {new Date(application.identityVerifiedAt).toLocaleString("en-IN")}.
              </p>
            )}
          </div>
          {application.identityVerificationStatus === "APPROVED" && (
            <IdentityVerificationTracker
              status="APPROVED"
              verifiedAt={application.identityVerifiedAt}
            />
          )}
        </div>
      )}

      <div className="text-sm text-gray-500">
        Need help? Visit{" "}
        <Link href="/applicant/support" className="text-primary-700 underline">
          Support
        </Link>{" "}
        or check{" "}
        <Link href="/applicant/status" className="text-primary-700 underline">
          Application Tracking
        </Link>
        .
      </div>
    </div>
  );
}
