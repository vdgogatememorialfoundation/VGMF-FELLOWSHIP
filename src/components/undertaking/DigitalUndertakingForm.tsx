"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SignaturePad } from "@/components/undertaking/SignaturePad";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { compressSignatureDataUrl } from "@/lib/signature-image";


type UndertakingRecord = {
  id: string;
  fullName: string;
  pdfUrl: string;
  ipAddress: string;
  submittedAt: string;
  signatureType: string;
};

type ApplicationInfo = {
  id: string;
  applicationNumber: string;
  name: string;
  status: string;
};

export function DigitalUndertakingForm() {
  const [application, setApplication] = useState<ApplicationInfo | null>(null);
  const [undertaking, setUndertaking] = useState<UndertakingRecord | null>(null);
  const [cmsContent, setCmsContent] = useState("");
  const [fullName, setFullName] = useState("");
  const [agreeRules, setAgreeRules] = useState(false);
  const [certifyCorrect, setCertifyCorrect] = useState(false);
  const [agreeFunds, setAgreeFunds] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"draw" | "upload">("draw");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  const reload = useCallback(() => {
    setPageLoading(true);
    setError("");
    Promise.all([
      fetch("/api/undertaking").then((r) => r.json()),
      fetch("/api/cms?slug=UNDERTAKING").then((r) => r.json()),
    ])
      .then(([undertakingData, cmsData]) => {
        setApplication(undertakingData.application);
        setUndertaking(undertakingData.undertaking);
        if (undertakingData.application?.name) {
          setFullName(undertakingData.application.name);
        }
        if (cmsData.page?.content) {
          setCmsContent(cmsData.page.content);
        }
      })
      .catch(() => {
        setError("Could not load undertaking page. Please refresh and try again.");
      })
      .finally(() => {
        setPageLoading(false);
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function handleUploadSignature(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setSignatureDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!application) {
      setError("Please save your application draft first from the Forms page.");
      return;
    }
    if (!fullName.trim()) {
      setError("Please type your full name as on your registration.");
      return;
    }
    if (!agreeRules || !certifyCorrect || !agreeFunds) {
      setError("Please accept all three declarations.");
      return;
    }
    if (!signatureDataUrl) {
      setError("Please draw or upload your signature.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const signatureBlob = await compressSignatureDataUrl(signatureDataUrl);
      const formData = new FormData();
      formData.append("applicationId", application.id);
      formData.append("fullName", fullName.trim());
      formData.append("agreeFellowshipRules", agreeRules ? "true" : "false");
      formData.append("certifyInfoCorrect", certifyCorrect ? "true" : "false");
      formData.append("agreeFundUtilization", agreeFunds ? "true" : "false");
      formData.append("signatureType", signatureMode === "upload" ? "upload" : "draw");
      formData.append("signature", signatureBlob, "signature.png");

      const res = await fetch("/api/undertaking", {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          res.status >= 500
            ? "Server error while submitting. Please try again in a moment."
            : "Unexpected server response. Please refresh and try again."
        );
      }

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to submit undertaking");
        return;
      }

      reload();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to submit undertaking");
    }
  }

  if (pageLoading) {
    return <p className="py-12 text-center text-gray-500">Loading undertaking...</p>;
  }

  if (error && !application && !undertaking) {
    return (
      <div className="card py-12 text-center">
        <p className="text-red-700">{error}</p>
        <Button className="mt-4" onClick={reload}>
          Retry
        </Button>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="card py-12 text-center">
        <h1 className="text-xl font-semibold">Digital Undertaking</h1>
        <p className="mt-2 text-gray-600">
          Start your fellowship application first to receive an application number, then return here
          to sign the digital undertaking.
        </p>
        <Link href="/applicant/forms" className="btn-primary mt-6 inline-block">
          Go to Application Form
        </Link>
      </div>
    );
  }

  if (undertaking) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Digital Undertaking — Submitted</h1>
          <p className="mt-1 text-gray-600">
            Application {application.applicationNumber} · Recorded on file
          </p>
        </div>

        <div className="card space-y-3 border-green-200 bg-green-50/50">
          <p className="font-medium text-green-900">Your digital undertaking is on record.</p>
          <div className="grid gap-2 text-sm text-green-800 sm:grid-cols-2">
            <p>
              <strong>Signed as:</strong> {undertaking.fullName}
            </p>
            <p>
              <strong>Submitted:</strong>{" "}
              {new Date(undertaking.submittedAt).toLocaleString("en-IN")}
            </p>
            <p>
              <strong>IP Address:</strong> {undertaking.ipAddress}
            </p>
            <p>
              <strong>Signature:</strong> {undertaking.signatureType === "DRAWN" ? "Drawn" : "Uploaded"}
            </p>
          </div>
          <a
            href={undertaking.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 underline"
          >
            Download Undertaking PDF
          </a>
        </div>



        <Link href="/applicant/forms" className="text-sm text-primary-700 underline">
          ← Back to application form
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Digital Undertaking</h1>
        <p className="mt-1 text-gray-600">
          Application {application.applicationNumber} — read, declare, sign, and submit
        </p>
      </div>

      <div className="card prose prose-sm max-w-none text-gray-700">
        <h2 className="text-lg font-semibold text-gray-900">Read Undertaking</h2>
        {cmsContent ? (
          <div className="whitespace-pre-wrap">{cmsContent}</div>
        ) : (
          <p>
            I undertake to abide by all fellowship rules, certify that my application information is
            correct, and agree to fund utilization conditions of the Vd. Gogate Memorial Foundation.
          </p>
        )}
        <p className="mt-4 text-xs text-gray-500">
          Also see the{" "}
          <Link href="/rulebook" target="_blank" className="text-primary-700 underline">
            Fellowship Rulebook
          </Link>
        </p>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Declarations</h2>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600"
            checked={agreeRules}
            onChange={(e) => setAgreeRules(e.target.checked)}
          />
          <span>I agree to fellowship rules (Rulebook &amp; programme terms)</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600"
            checked={certifyCorrect}
            onChange={(e) => setCertifyCorrect(e.target.checked)}
          />
          <span>I certify that all information submitted is correct</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600"
            checked={agreeFunds}
            onChange={(e) => setAgreeFunds(e.target.checked)}
          />
          <span>I agree to fund utilization conditions and proper accounting</span>
        </label>
      </div>

      <div className="card space-y-4">
        <Input
          label="Type your full name (as on registration)"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Signature</p>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSignatureMode("draw");
                setSignatureDataUrl(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                signatureMode === "draw"
                  ? "bg-primary-100 text-primary-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Draw signature
            </button>
            <button
              type="button"
              onClick={() => {
                setSignatureMode("upload");
                setSignatureDataUrl(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                signatureMode === "upload"
                  ? "bg-primary-100 text-primary-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Upload signature image
            </button>
          </div>

          {signatureMode === "draw" ? (
            <SignaturePad onSignatureChange={setSignatureDataUrl} />
          ) : (
            <div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="block w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadSignature(file);
                }}
              />
              {signatureDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signatureDataUrl}
                  alt="Uploaded signature preview"
                  className="mt-2 max-h-24 rounded border"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap gap-3">
        <Button loading={loading} onClick={submit}>
          Submit Digital Undertaking
        </Button>
        <Link href="/applicant/forms" className="btn-secondary inline-flex items-center">
          Back to Form
        </Link>
      </div>

      <p className="text-xs text-gray-500">
        On submit, the system generates a signed PDF with your application number, timestamp, and IP
        address for audit purposes.
      </p>
    </div>
  );
}
