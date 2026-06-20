"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Leaf } from "lucide-react";
import type { PortalType } from "@/lib/portal";
import { PORTAL_LABELS, PORTAL_DASHBOARD_PATHS } from "@/lib/portal";
import { formatOtpResendLabel, useOtpResendCooldown } from "@/lib/use-otp-resend-cooldown";

type OtpChannel = "phone" | "email";
type LoginMode = "otp" | "password";

interface PortalLoginFormProps {
  portal: PortalType;
  showRegisterLink?: boolean;
  loginPasswordEnabled?: boolean;
  loginOtpWhatsappEnabled?: boolean;
  loginOtpEmailEnabled?: boolean;
}

function safeNextPath(value: string | null, portal: PortalType): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  const portalPrefix = PORTAL_DASHBOARD_PATHS[portal];
  if (value === portalPrefix || value.startsWith(`${portalPrefix}/`)) {
    return value;
  }
  return null;
}

function PortalLoginFormInner({
  portal,
  showRegisterLink,
  loginPasswordEnabled = false,
  loginOtpWhatsappEnabled = true,
  loginOtpEmailEnabled = false,
}: PortalLoginFormProps) {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"), portal);
  const isApplicant = portal === "applicant";
  const otpLoginAvailable = isApplicant && (loginOtpWhatsappEnabled || loginOtpEmailEnabled);
  const passwordLoginAvailable = !isApplicant || loginPasswordEnabled;
  const defaultMode: LoginMode =
    otpLoginAvailable && !passwordLoginAvailable
      ? "otp"
      : passwordLoginAvailable && !otpLoginAvailable
        ? "password"
        : otpLoginAvailable
          ? "otp"
          : "password";

  const [mode, setMode] = useState<LoginMode>(defaultMode);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otpChannel, setOtpChannel] = useState<OtpChannel>(
    loginOtpWhatsappEnabled ? "phone" : "email"
  );
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const otpResendCooldown = useOtpResendCooldown();

  const showModeTabs = useMemo(
    () => otpLoginAvailable && passwordLoginAvailable,
    [otpLoginAvailable, passwordLoginAvailable]
  );

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          portal,
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      window.location.assign(data.redirect || nextPath || PORTAL_DASHBOARD_PATHS[portal]);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendLoginOtp() {
    if (otpSent && !otpResendCooldown.canResend) {
      return;
    }

    if (otpChannel === "phone") {
      if (!identifier || identifier.replace(/\s/g, "").length < 10) {
        setError("Enter a valid mobile number first");
        return;
      }
    } else if (!identifier.includes("@")) {
      setError("Enter a valid email address first");
      return;
    }

    setOtpLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: otpChannel,
          phone: otpChannel === "phone" ? identifier : undefined,
          email: otpChannel === "email" ? identifier : undefined,
          purpose: "LOGIN",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP");
        return;
      }

      setOtpSent(true);
      otpResendCooldown.startCooldown();
      setMessage(
        otpChannel === "phone"
          ? "OTP sent to your WhatsApp. Enter it below to sign in."
          : "OTP sent to your email. Enter it below to sign in."
      );
    } catch {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleOtpLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: otpChannel,
          phone: otpChannel === "phone" ? identifier : undefined,
          email: otpChannel === "email" ? identifier : undefined,
          code: otp,
          portal,
        }),
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      window.location.assign(data.redirect || nextPath || PORTAL_DASHBOARD_PATHS[portal]);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg">
              <Leaf className="h-7 w-7" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-ink">
                Vaidya Gogate Memorial Foundation
              </p>
              <p className="text-sm font-semibold text-primary-600">
                {PORTAL_LABELS[portal]}
              </p>
            </div>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-ink">Sign In</h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "otp" && otpLoginAvailable
              ? "Verify with OTP to access your applicant account"
              : `Authorized ${PORTAL_LABELS[portal].toLowerCase()} access only`}
          </p>
        </div>

        <div className="card">
          {showModeTabs && (
            <div className="mb-4 flex rounded-xl border border-gray-200 p-1">
              {otpLoginAvailable && (
                <button
                  type="button"
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    mode === "otp"
                      ? "bg-primary-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setMode("otp");
                    setError("");
                    setMessage("");
                  }}
                >
                  WhatsApp OTP
                </button>
              )}
              {passwordLoginAvailable && (
                <button
                  type="button"
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    mode === "password"
                      ? "bg-primary-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setMode("password");
                    setError("");
                    setMessage("");
                  }}
                >
                  Password
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {message && (
            <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{message}</div>
          )}

          {mode === "otp" && otpLoginAvailable ? (
            <form onSubmit={handleOtpLogin} className="space-y-4">
              {loginOtpWhatsappEnabled && loginOtpEmailEnabled && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      otpChannel === "phone"
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-gray-600"
                    }`}
                    onClick={() => {
                      setOtpChannel("phone");
                      setOtpSent(false);
                      setOtp("");
                      setIdentifier("");
                      otpResendCooldown.resetCooldown();
                    }}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      otpChannel === "email"
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-gray-600"
                    }`}
                    onClick={() => {
                      setOtpChannel("email");
                      setOtpSent(false);
                      setOtp("");
                      setIdentifier("");
                      otpResendCooldown.resetCooldown();
                    }}
                  >
                    Email
                  </button>
                </div>
              )}

              <Input
                label={otpChannel === "phone" ? "Mobile Number (WhatsApp)" : "Email"}
                type={otpChannel === "phone" ? "tel" : "email"}
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setOtpSent(false);
                  setOtp("");
                  otpResendCooldown.resetCooldown();
                }}
                placeholder={otpChannel === "phone" ? "91XXXXXXXXXX" : "your@email.com"}
                required
              />

              {!otpSent ? (
                <Button
                  type="button"
                  variant="secondary"
                  loading={otpLoading}
                  className="w-full"
                  onClick={handleSendLoginOtp}
                >
                  Send OTP
                </Button>
              ) : (
                <>
                  <Input
                    label="OTP"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-digit code"
                    required
                  />
                  <Button type="submit" loading={loading} className="w-full">
                    Verify & Sign In
                  </Button>
                  <button
                    type="button"
                    className={`w-full text-sm ${
                      otpResendCooldown.canResend
                        ? "text-primary-600 hover:underline"
                        : "cursor-not-allowed text-gray-400"
                    }`}
                    disabled={!otpResendCooldown.canResend || otpLoading}
                    onClick={handleSendLoginOtp}
                  >
                    {formatOtpResendLabel("Resend OTP", otpResendCooldown.secondsLeft, true)}
                  </button>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <Input
                label="Email or Phone"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="your@email.com"
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button type="submit" loading={loading} className="w-full">
                Sign In to {PORTAL_LABELS[portal]}
              </Button>
            </form>
          )}

          {showRegisterLink && (
            <p className="mt-6 text-center text-sm text-muted">
              New applicant?{" "}
              <Link href="/register" className="font-semibold text-primary-600 hover:text-primary-700">
                Create account
              </Link>
            </p>
          )}

          <p className="mt-4 text-center text-sm">
            <Link href="/" className="text-muted hover:text-primary-600">
              ← Back to main site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function PortalLoginForm(props: PortalLoginFormProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4 py-12 text-sm text-gray-500">
          Loading sign in...
        </div>
      }
    >
      <PortalLoginFormInner {...props} />
    </Suspense>
  );
}
