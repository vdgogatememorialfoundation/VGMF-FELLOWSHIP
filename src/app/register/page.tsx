"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [userId, setUserId] = useState("");

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "phone") {
      setOtpSent(false);
      setOtpVerified(false);
      setOtp("");
    }
  }

  async function handleSendOtp() {
    if (!form.phone || form.phone.length < 10) {
      setError("Enter a valid mobile number first");
      return;
    }

    setOtpLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, purpose: "REGISTER" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setOtpSent(true);
      setMessage("OTP sent to your WhatsApp. Please enter it below.");
    } catch {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp || otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }

    setOtpLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, code: otp, purpose: "REGISTER" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setOtpVerified(true);
      setMessage("Mobile number verified successfully!");
    } catch {
      setError("Failed to verify OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!otpVerified) {
      setError("Please verify your mobile number with WhatsApp OTP first");
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
      setTimeout(() => router.push(data.redirect), 2000);
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
            Verify your mobile via WhatsApp OTP to register
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
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
            />

            <div>
              <Input
                label="Mobile Number (WhatsApp)"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="91XXXXXXXXXX or 10-digit number"
                required
              />
              {!otpVerified && (
                <Button
                  type="button"
                  variant="secondary"
                  loading={otpLoading}
                  className="mt-2 w-full"
                  onClick={handleSendOtp}
                >
                  {otpSent ? "Resend OTP on WhatsApp" : "Send OTP on WhatsApp"}
                </Button>
              )}
            </div>

            {otpSent && !otpVerified && (
              <div>
                <Input
                  label="WhatsApp OTP"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  required
                />
                <Button
                  type="button"
                  loading={otpLoading}
                  className="mt-2 w-full"
                  onClick={handleVerifyOtp}
                >
                  Verify OTP
                </Button>
              </div>
            )}

            {otpVerified && (
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
              disabled={!otpVerified}
            />
            <Input
              label="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              required
              disabled={!otpVerified}
            />

            <Button type="submit" loading={loading} className="w-full" disabled={!otpVerified}>
              Register
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
