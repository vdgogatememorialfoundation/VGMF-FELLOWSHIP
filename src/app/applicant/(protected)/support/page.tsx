"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

function SupportContent() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback("");

    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setFeedback("Support ticket submitted successfully! We will get back to you soon.");
      setSubject("");
      setMessage("");
    } else {
      setFeedback(data.error);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        <p className="mt-1 text-gray-600">Need help? Submit a support ticket and our team will assist you.</p>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Contact Information</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>Email: support@vgmf.org</p>
          <p>Phone: +91-XXXX-XXXXXX</p>
          <p>Hours: Monday - Friday, 9:00 AM - 6:00 PM IST</p>
        </div>
      </div>

      {feedback && (
        <div className={`rounded-lg p-3 text-sm ${feedback.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {feedback}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        <Textarea label="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={6} required />
        <Button type="submit" loading={loading}>Submit Ticket</Button>
      </form>
    </div>
  );
}

export default function SupportPage() {
  return <SupportContent />;
}
