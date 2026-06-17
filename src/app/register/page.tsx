"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type OtpChannel = "phone" | "email";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [phoneOtpVerified, setPhoneOtpVerified] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState<OtpChannel | null>(null);
  const [userId, setUserId] = useState("");

  const verificationComplete = phoneOtpVerified && emailOtpVerified;

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === "phone") {
      setPhoneOtpSent(false);
      setPhoneOtpVerified(false);
      setPhoneOtp("");
    }

    if (field === "email") {
      setEmailOtpSent(false);
      setEmailOtpVerified(false);
      setEmailOtp("");
    }
  }

  async function handleSendOtp(channel: OtpChannel) {
    if (channel === "phone") {
      if (!form.phone || form.phone.length < 10) {
        setError("Enter a valid mobile number first");
        return;
      }
    } else if (!form.email || !form.email.includes("@")) {
      setError("Enter a valid email address first");
      return;
    }

    setOtpLoading(channel);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          phone: channel === "phone" ? form.phone : undefined,
          email: channel === "email" ? form.email : undefined,
          purpose: "REGISTER",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      if (channel === "phone") {
        setPhoneOtpSent(true);
        setMessage("OTP sent to your WhatsApp. Please enter it below.");
      } else {
        setEmailOtpSent(true);
        setMessage("OTP sent to your email. Please enter it below.");
      }
    } catch {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(null);
    }
  }

  async function handleVerifyOtp(channel: OtpChannel) {
    const otp = channel === "phone" ? phoneOtp : emailOtp;

    if (!otp || otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }

    setOtpLoading(channel);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          phone: channel === "phone" ? form.phone : undefined,
          email: channel === "email" ? form.email : undefined,
          code: otp,
          purpose: "REGISTER",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      if (channel === "phone") {
        setPhoneOtpVerified(true);
        setMessage("Mobile number verified successfully!");
      } else {
        setEmailOtpVerified(true);
        setMessage("Email address verified successfully!");
      }
    } catch {
      setError("Failed to verify OTP. Please try again.");
    } finally {
      setOtpLoading(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!phoneOtpVerified) {
      setError("Please verify your mobile number with WhatsApp OTP first");
      return;
    }

    if (!emailOtpVerified) {
      setError("Please verify your email address with email OTP first");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setUserId(data.user.userId);
      window.location.href = data.redirect;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Registration Successful!</h2>
          <p className="mt-2 text-gray-600">Your User ID is:</p>
          <p className="mt-2 text-2xl font-bold text-primary-600">{userId}</p>
          <p className="mt-4 text-sm text-gray-500">A welcome email has been sent. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-lg font-bold text-white">
              V
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Applicant Registration</h1>
          <p className="mt-2 text-sm text-gray-600">
            Verify your email and mobile via OTP to register
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            {message && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>
            )}

            <Input
              label="Full Name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />

            <div>
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
              {!emailOtpVerified && (
                <Button
                  type="button"
                  variant="secondary"
                  loading={otpLoading === "email"}
                  className="mt-2 w-full"
                  onClick={() => handleSendOtp("email")}
                >
                  {emailOtpSent ? "Resend OTP to Email" : "Send OTP to Email"}
                </Button>
              )}
            </div>

            {emailOtpSent && !emailOtpVerified && (
              <div>
                <Input
                  label="Email OTP"
                  type="text"
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  required
                />
                <Button
                  type="button"
                  loading={otpLoading === "email"}
                  className="mt-2 w-full"
                  onClick={() => handleVerifyOtp("email")}
                >
                  Verify Email OTP
                </Button>
              </div>
            )}

            {emailOtpVerified && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                Email address verified
              </div>
            )}

            <div>
              <Input
                label="Mobile Number (WhatsApp)"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="91XXXXXXXXXX or 10-digit number"
                required
              />
              {!phoneOtpVerified && (
                <Button
                  type="button"
                  variant="secondary"
                  loading={otpLoading === "phone"}
                  className="mt-2 w-full"
                  onClick={() => handleSendOtp("phone")}
                >
                  {phoneOtpSent ? "Resend OTP on WhatsApp" : "Send OTP on WhatsApp"}
                </Button>
              )}
            </div>

            {phoneOtpSent && !phoneOtpVerified && (
              <div>
                <Input
                  label="WhatsApp OTP"
                  type="text"
                  maxLength={6}
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  required
                />
                <Button
                  type="button"
                  loading={otpLoading === "phone"}
                  className="mt-2 w-full"
                  onClick={() => handleVerifyOtp("phone")}
                >
                  Verify WhatsApp OTP
                </Button>
              </div>
            )}

            {phoneOtpVerified && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                Mobile number verified via WhatsApp
              </div>
            )}

            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              required
              disabled={!verificationComplete}
            />
            <Input
              label="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              required
              disabled={!verificationComplete}
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              disabled={!verificationComplete}
            >
              Register
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/applicant" className="font-medium text-primary-600 hover:text-primary-700">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
