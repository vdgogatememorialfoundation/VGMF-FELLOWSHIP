"use client";

import {
  summarizeDigioDecision,
  getVerificationPurposeLabel,
  getVerificationStatusLabel,
} from "@/lib/digio-decision";

type VerificationSessionRecord = {
  id: string;
  providerRequestId: string;
  purpose: "APPLICANT_IDENTITY" | "BANK_ACCOUNT" | "UNDERTAKING_IDENTITY";
  status: string;
  completedAt: string | null;
  createdAt: string;
  decisionJson: unknown;
};

function DetailGrid({ items }: { items: Array<{ label: string; value: string | null }> }) {
  const visible = items.filter((item) => item.value);
  if (visible.length === 0) return null;

  return (
    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
      {visible.map((item) => (
        <div key={item.label}>
          <dt className="text-xs uppercase tracking-wide text-gray-500">{item.label}</dt>
          <dd className="text-sm text-gray-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AdminDigioVerificationPanel({
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
        No Digio verification sessions recorded for this application yet.
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
        const summary = summarizeDigioDecision(session.decisionJson);
        const idCheck = summary.idVerifications[0];
        const liveness = summary.livenessChecks[0];
        const faceMatch = summary.faceMatches[0];
        const bank = summary.bankVerification;

        return (
          <div key={session.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">
                  {getVerificationPurposeLabel(session.purpose)}
                </p>
                <p className="mt-1 font-mono text-xs text-gray-500">{session.providerRequestId}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                {getVerificationStatusLabel(session.status)}
              </span>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Started {new Date(session.createdAt).toLocaleString("en-IN")}
              {session.completedAt &&
                ` · Completed ${new Date(session.completedAt).toLocaleString("en-IN")}`}
            </p>

            {idCheck && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">ID document</p>
                <DetailGrid
                  items={[
                    { label: "Status", value: idCheck.status },
                    {
                      label: "Name",
                      value:
                        [idCheck.firstName, idCheck.lastName].filter(Boolean).join(" ") || null,
                    },
                    { label: "Document type", value: idCheck.documentType },
                    { label: "Document number", value: idCheck.documentNumber },
                    { label: "Date of birth", value: idCheck.dateOfBirth },
                    { label: "Nationality", value: idCheck.nationality },
                  ]}
                />
              </div>
            )}

            {session.purpose === "BANK_ACCOUNT" && (bank.beneficiaryName || bank.accountNumber) && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">Bank verification</p>
                <DetailGrid
                  items={[
                    { label: "Status", value: bank.status },
                    { label: "Account holder", value: bank.beneficiaryName },
                    { label: "Account number", value: bank.accountNumber },
                    { label: "IFSC", value: bank.ifsc },
                    {
                      label: "Name match score",
                      value:
                        bank.fuzzyMatchScore != null ? String(bank.fuzzyMatchScore) : null,
                    },
                  ]}
                />
              </div>
            )}

            {(liveness || faceMatch) && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {liveness && (
                  <div className="rounded-lg bg-gray-50 p-3 text-sm">
                    <p className="font-medium text-gray-900">Liveness</p>
                    <p className="mt-1 text-gray-700">{liveness.status}</p>
                    {liveness.score != null && (
                      <p className="text-xs text-gray-500">Score: {liveness.score}</p>
                    )}
                  </div>
                )}
                {faceMatch && (
                  <div className="rounded-lg bg-gray-50 p-3 text-sm">
                    <p className="font-medium text-gray-900">Face match</p>
                    <p className="mt-1 text-gray-700">{faceMatch.status}</p>
                    {faceMatch.score != null && (
                      <p className="text-xs text-gray-500">Score: {faceMatch.score}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!session.decisionJson && (
              <p className="mt-3 text-sm text-amber-800">
                Detailed verification data is not stored yet. It will appear after the Digio webhook
                delivers the response or when the session is refreshed.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
