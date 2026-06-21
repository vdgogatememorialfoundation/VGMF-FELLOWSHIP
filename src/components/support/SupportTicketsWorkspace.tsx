"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  getSupportStatusColor,
  getSupportStatusLabel,
  isTicketClosed,
} from "@/lib/support-tickets";

export type SupportTicketClient = {
  id: string;
  subject: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  replyCount: number;
  replies: Array<{
    id: string;
    body: string;
    isStaffReply: boolean;
    createdAt: string;
    authorName: string;
  }>;
  applicant?: {
    id: string;
    userId: string;
    name: string;
    email: string;
  };
  assignedTo?: { id: string; userId: string; name: string } | null;
};

interface SupportTicketThreadProps {
  ticket: SupportTicketClient;
  mode: "applicant" | "staff";
  onUpdated: (ticket: SupportTicketClient) => void;
}

export function SupportTicketThread({ ticket, mode, onUpdated }: SupportTicketThreadProps) {
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState("");
  const [localStatus, setLocalStatus] = useState(ticket.status);

  useEffect(() => {
    setLocalStatus(ticket.status);
  }, [ticket.status]);

  async function sendReply() {
    if (!reply.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/support/${ticket.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to send reply");
      return;
    }
    setReply("");
    onUpdated(data.ticket);
  }

  async function updateStatus(status: string) {
    setStatusLoading(true);
    setError("");
    const res = await fetch(`/api/support/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setStatusLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to update status");
      return;
    }
    setLocalStatus(data.ticket.status);
    onUpdated(data.ticket);
  }

  const closed = isTicketClosed(localStatus);
  const canReply = mode === "staff" || !closed;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{ticket.subject}</h2>
            {mode === "staff" && ticket.applicant && (
              <p className="mt-1 text-sm text-gray-600">
                {ticket.applicant.name} · {ticket.applicant.userId} · {ticket.applicant.email}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Opened {new Date(ticket.createdAt).toLocaleString("en-IN")}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              getSupportStatusColor(localStatus)
            )}
          >
            {getSupportStatusLabel(localStatus)}
          </span>
        </div>

        {mode === "staff" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(["OPEN", "IN_PROGRESS", "WAITING_ON_APPLICANT", "RESOLVED", "CLOSED"] as const).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  disabled={statusLoading || localStatus === status}
                  onClick={() => updateStatus(status)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                    localStatus === status
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {getSupportStatusLabel(status)}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {ticket.replies.map((item) => (
          <div
            key={item.id}
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
              item.isStaffReply
                ? "ml-auto bg-primary-600 text-white"
                : "bg-gray-100 text-gray-900"
            )}
          >
            <p className="mb-1 text-xs font-semibold opacity-80">{item.authorName}</p>
            <p className="whitespace-pre-wrap leading-relaxed">{item.body}</p>
            <p className="mt-2 text-[10px] opacity-70">
              {new Date(item.createdAt).toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>

      {canReply ? (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <Textarea
            label={mode === "staff" ? "Reply to applicant" : "Your message"}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={4}
            placeholder={
              mode === "staff"
                ? "Type your response — the applicant will be notified."
                : "Type your follow-up message…"
            }
          />
          <Button className="mt-3" loading={loading} onClick={sendReply}>
            Send reply
          </Button>
        </div>
      ) : (
        <p className="mt-4 border-t border-gray-200 pt-4 text-sm text-gray-500">
          This ticket is closed. Open a new ticket if you need further help.
        </p>
      )}
    </div>
  );
}

interface SupportTicketsWorkspaceProps {
  mode: "applicant" | "staff";
  contactEmail?: string;
  contactPhone?: string;
}

export function SupportTicketsWorkspace({
  mode,
  contactEmail,
  contactPhone,
}: SupportTicketsWorkspaceProps) {
  const [tickets, setTickets] = useState<SupportTicketClient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/support");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to load tickets");
      return;
    }
    const rows = data.tickets || [];
    setTickets(rows);
    setSelectedId((current) => current ?? rows[0]?.id ?? null);
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    setFeedback("");
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error || "Failed to create ticket");
      return;
    }
    setSubject("");
    setMessage("");
    setShowCreate(false);
    setFeedback("Support ticket created. Our team will respond here.");
    await loadTickets();
    setSelectedId(data.ticket.id);
  }

  function handleTicketUpdated(updated: SupportTicketClient) {
    setTickets((current) => current.map((t) => (t.id === updated.id ? updated : t)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === "staff" ? "Support Tickets" : "Support"}
        </h1>
        <p className="mt-1 text-gray-600">
          {mode === "staff"
            ? "View applicant tickets and reply in real time. Only admin and staff users with portal access can respond here."
            : "Open a support ticket and chat with our team. All messages stay in this thread."}
        </p>
      </div>

      {mode === "applicant" && (contactEmail || contactPhone) && (
        <div className="card text-sm text-gray-600">
          <p className="font-medium text-gray-900">Contact</p>
          {contactEmail && <p className="mt-1">Email: {contactEmail}</p>}
          {contactPhone && <p>Phone: {contactPhone}</p>}
        </div>
      )}

      {feedback && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{feedback}</div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Tickets</h2>
            {mode === "applicant" && (
              <Button className="text-xs" onClick={() => setShowCreate((v) => !v)}>
                {showCreate ? "Cancel" : "New ticket"}
              </Button>
            )}
          </div>

          {showCreate && mode === "applicant" && (
            <form onSubmit={createTicket} className="space-y-3 border-b border-gray-200 pb-4">
              <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              <Textarea
                label="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
              <Button type="submit" loading={creating} className="w-full">
                Submit ticket
              </Button>
            </form>
          )}

          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-gray-500">No tickets yet.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedId(ticket.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left text-sm transition",
                    selectedId === ticket.id
                      ? "border-primary-300 bg-primary-50"
                      : "border-gray-200 hover:border-primary-200"
                  )}
                >
                  <p className="font-medium text-gray-900 line-clamp-1">{ticket.subject}</p>
                  {mode === "staff" && ticket.applicant && (
                    <p className="text-xs text-gray-500 line-clamp-1">{ticket.applicant.name}</p>
                  )}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        getSupportStatusColor(ticket.status)
                      )}
                    >
                      {ticket.statusLabel}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(ticket.updatedAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card min-h-[420px]">
          {selected ? (
            <SupportTicketThread
              ticket={selected}
              mode={mode}
              onUpdated={handleTicketUpdated}
            />
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-gray-500">
              {mode === "applicant"
                ? "Create a ticket or select one from the list."
                : "Select a ticket to view the conversation."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
