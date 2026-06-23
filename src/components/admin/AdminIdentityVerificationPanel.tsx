"use client";

import { getVerificationPurposeLabel, getVerificationStatusLabel } from "@/lib/idnorm";

type VerificationSessionRecord = {
  id: string;
  providerRequestId: string;
  provider: string;
  purpose: "APPLICANT_IDENTITY" | "BANK_ACCOUNT" | "UNDERTAKING_IDENTITY";
  status: string;
  completedAt: string | null;
  createdAt: string;
  decisionJson: unknown;
};

export function AdminIdentityVerificationPanel({
  sessions,
  identityStatus,
  identityVerifiedAt,
}: {
  sessions: VerificationSessionRecord[];
  identityStatus?: string | null;
  identityVerifiedAt?: string | null;
}) {
  if (sessions.length === 0 && !identityStatus) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
        No verification sessions recorded for this application yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(identityStatus || identityVerifiedAt) && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          Application identity status:{" "}
          <strong>{identityStatus?.replace(/_/g, " ") ?? "Not started"}</strong>
          {identityVerifiedAt &&
            ` · Verified ${new Date(identityVerifiedAt).toLocaleString("en-IN")}`}
        </div>
      )}

      {sessions.map((session) => {
        return (
          <div key={session.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">
                  {getVerificationPurposeLabel(session.purpose)}
                </p>
                <p className="mt-1 font-mono text-xs text-gray-500">{session.providerRequestId} ({session.provider})</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                {getVerificationStatusLabel(session.status as never)}
              </span>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Started {new Date(session.createdAt).toLocaleString("en-IN")}
              {session.completedAt &&
                ` · Completed ${new Date(session.completedAt).toLocaleString("en-IN")}`}
            </p>

            {Boolean(session.decisionJson) && (
               <div className="mt-4 rounded-lg bg-gray-50 p-3">
                 <p className="text-sm font-medium text-gray-900">Verification Details</p>
                 <pre className="text-xs text-gray-600 mt-2 overflow-x-auto">
                   {JSON.stringify(session.decisionJson, null, 2)}
                 </pre>
               </div>
            )}

            {!Boolean(session.decisionJson) && (
              <p className="mt-3 text-sm text-amber-800">
                Detailed verification data is not stored yet. It will appear after the webhook
                delivers the response or when the session is refreshed.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
