"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatNumericId } from "@/lib/format-ids";

type OtpChannel = "phone" | "email";

interface RegisterFormProps {
  loginEnabled?: boolean;
  signupOtpEmailEnabled?: boolean;
  signupOtpWhatsappEnabled?: boolean;
  signupPasswordEnabled?: boolean;
}

export function RegisterForm({
  loginEnabled = true,
  signupOtpEmailEnabled = false,
  signupOtpWhatsappEnabled = true,
  signupPasswordEnabled = false,
}: RegisterFormProps) {
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
  const lastEmailForOtp = useRef("");
  const lastPhoneForOtp = useRef("");

  const emailOk = !signupOtpEmailEnabled || emailOtpVerified;
  const phoneOk = !signupOtpWhatsappEnabled || phoneOtpVerified;
  const otpRequired = signupOtpEmailEnabled || signupOtpWhatsappEnabled;
  const verificationComplete = otpRequired ? emailOk && phoneOk : true;
  const canSubmit = verificationComplete && (!signupPasswordEnabled || form.password.length >= 8);

  function resetEmailOtpState() {
    setEmailOtpSent(false);
    setEmailOtpVerified(false);
    setEmailOtp("");
    lastEmailForOtp.current = "";
  }

  function resetPhoneOtpState() {
    setPhoneOtpSent(false);
    setPhoneOtpVerified(false);
    setPhoneOtp("");
    lastPhoneForOtp.current = "";
  }

  function updateField(field: string, value: string) {
    if (field === "email") {
      if (value === form.email) return;
      if (!emailOtpVerified || value.trim().toLowerCase() !== lastEmailForOtp.current) {
        resetEmailOtpState();
      }
    }

    if (field === "phone") {
      if (value === form.phone) return;
      if (!phoneOtpVerified || value !== lastPhoneForOtp.current) {
        resetPhoneOtpState();
      }
    }

    setForm((prev) => ({ ...prev, [field]: value }));
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
        lastPhoneForOtp.current = form.phone;
        setMessage("OTP sent to your WhatsApp. Please enter it below.");
      } else {
        setEmailOtpSent(true);
        lastEmailForOtp.current = form.email.trim().toLowerCase();
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
        lastEmailForOtp.current = form.email.trim().toLowerCase();
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

    if (otpRequired && signupOtpWhatsappEnabled && !phoneOtpVerified) {
      setError("Please verify your mobile number with WhatsApp OTP first");
      return;
    }

    if (otpRequired && signupOtpEmailEnabled && !emailOtpVerified) {
      setError("Please verify your email address with email OTP first");
      return;
    }

    if (signupPasswordEnabled) {
      if (!form.password || form.password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          ...(signupPasswordEnabled
            ? { password: form.password, confirmPassword: form.confirmPassword }
            : {}),
        }),
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
          {/^\d{12}$/.test(userId) && (
            <p className="mt-1 text-sm text-gray-500">{formatNumericId(userId)}</p>
          )}
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
            {signupOtpEmailEnabled && signupOtpWhatsappEnabled
              ? "Verify your email and mobile via OTP to register"
              : signupOtpEmailEnabled
                ? "Verify your email via OTP to register"
                : signupOtpWhatsappEnabled
                  ? "Verify your mobile via WhatsApp OTP, then complete registration"
                  : signupPasswordEnabled
                    ? "Complete the form below to register"
                    : "Enter your details to create your applicant account"}
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

            <div className="space-y-2">
              <Input
                label="Email"
                type="email"
                id="register-email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                disabled={emailOtpVerified}
                required
              />
              {emailOtpVerified ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  <span>Email address verified</span>
                  <button
                    type="button"
                    className="font-medium text-primary-700 hover:underline"
                    onClick={resetEmailOtpState}
                  >
                    Change
                  </button>
                </div>
              ) : signupOtpEmailEnabled ? (
                <Button
                  type="button"
                  variant="secondary"
                  loading={otpLoading === "email"}
                  className="w-full"
                  onClick={() => handleSendOtp("email")}
                >
                  {emailOtpSent ? "Resend OTP to Email" : "Send OTP to Email"}
                </Button>
              ) : null}
            </div>

            {signupOtpEmailEnabled && emailOtpSent && !emailOtpVerified && (
              <div className="space-y-2">
                <Input
                  label="Email OTP"
                  type="text"
                  id="register-email-otp"
                  name="email-otp"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  required
                />
                <Button
                  type="button"
                  loading={otpLoading === "email"}
                  className="w-full"
                  onClick={() => handleVerifyOtp("email")}
                >
                  Verify Email OTP
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Input
                label="Mobile Number (WhatsApp)"
                type="tel"
                id="register-phone"
                name="phone"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="91XXXXXXXXXX or 10-digit number"
                disabled={phoneOtpVerified}
                required
              />
              {phoneOtpVerified ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  <span>Mobile number verified via WhatsApp</span>
                  <button
                    type="button"
                    className="font-medium text-primary-700 hover:underline"
                    onClick={resetPhoneOtpState}
                  >
                    Change
                  </button>
                </div>
              ) : signupOtpWhatsappEnabled ? (
                <Button
                  type="button"
                  variant="secondary"
                  loading={otpLoading === "phone"}
                  className="w-full"
                  onClick={() => handleSendOtp("phone")}
                >
                  {phoneOtpSent ? "Resend OTP on WhatsApp" : "Send OTP on WhatsApp"}
                </Button>
              ) : null}
            </div>

            {signupOtpWhatsappEnabled && phoneOtpSent && !phoneOtpVerified && (
              <div className="space-y-2">
                <Input
                  label="WhatsApp OTP"
                  type="text"
                  id="register-phone-otp"
                  name="phone-otp"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  required
                />
                <Button
                  type="button"
                  loading={otpLoading === "phone"}
                  className="w-full"
                  onClick={() => handleVerifyOtp("phone")}
                >
                  Verify WhatsApp OTP
                </Button>
              </div>
            )}

            {signupPasswordEnabled && (
              <>
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
              </>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              disabled={!canSubmit}
            >
              Register
            </Button>
          </form>

          {loginEnabled && (
            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/applicant" className="font-medium text-primary-600 hover:text-primary-700">
                Sign In
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
