"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Leaf } from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      window.location.href = data.redirect;
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
              <p className="font-display text-lg font-bold text-ink">Vaidya Gogate Memorial Foundation</p>
              <p className="text-sm text-muted">Fellowship Portal 2026</p>
            </div>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-ink">Sign In</h1>
          <p className="mt-2 text-sm text-muted">
            Applicant, Admin, Staff, or Reviewer login
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <Input
              label="Email or Phone"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@vaidyagogate.org"
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
              Sign In
            </Button>
          </form>

          <div className="mt-6 rounded-xl bg-primary-50 p-4 text-xs text-ink-soft">
            <p className="font-semibold text-ink">Admin access</p>
            <p className="mt-1">Email: admin@vaidyagogate.org</p>
            <p>After first deploy, admin is auto-created. Contact support if login fails.</p>
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            New applicant?{" "}
            <Link href="/register" className="font-semibold text-primary-600 hover:text-primary-700">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
