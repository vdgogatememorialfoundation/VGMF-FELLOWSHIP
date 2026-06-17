"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function AcceptanceLetterUpload({
  fellowshipId,
  onUploaded,
}: {
  fellowshipId: string;
  onUploaded?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file: File) {
    setLoading(true);
    setMessage("");
    const formData = new FormData();
    formData.append("fellowshipId", fellowshipId);
    formData.append("file", file);

    const res = await fetch("/api/admin/fellowships", { method: "POST", body: formData });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error || "Upload failed");
      return;
    }

    setMessage("Acceptance letter uploaded");
    onUploaded?.();
  }

  return (
    <div className="text-sm">
      <input
        type="file"
        accept=".pdf,application/pdf"
        disabled={loading}
        className="block w-full max-w-xs text-xs"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {loading && <p className="mt-1 text-xs text-gray-500">Uploading...</p>}
      {message && <p className="mt-1 text-xs text-green-700">{message}</p>}
    </div>
  );
}
