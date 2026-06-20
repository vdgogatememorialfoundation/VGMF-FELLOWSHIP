"use client";

import { useState } from "react";

export function DocumentFileLink({
  href,
  fileName,
  className,
}: {
  href: string;
  fileName: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openFile(event: React.MouseEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(href, { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        let message = "File not found. Please upload the document again.";
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // Non-JSON error body
        }
        setError(message);
        return;
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      setError("Could not open file. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="block min-w-0">
      <button
        type="button"
        onClick={openFile}
        disabled={loading}
        className={className ?? "mt-1 block truncate text-left text-xs text-primary-600 hover:underline"}
      >
        {loading ? "Opening…" : fileName}
      </button>
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </span>
  );
}
