"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Leaf } from "lucide-react";
import type { PortalType } from "@/lib/portal";
import { PORTAL_LABELS, PORTAL_DASHBOARD_PATHS } from "@/lib/portal";

interface PortalLoginFormProps {
  portal: PortalType;
  showRegisterLink?: boolean;
}

function safeNextPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function PortalLoginFormInner({ portal, showRegisterLink }: PortalLoginFormProps) {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
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

      window.location.assign(nextPath || data.redirect || PORTAL_DASHBOARD_PATHS[portal]);
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
            Authorized {PORTAL_LABELS[portal].toLowerCase()} access only
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
