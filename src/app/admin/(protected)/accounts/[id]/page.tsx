"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatNumericId } from "@/lib/format-ids";
import { StatusBadge } from "@/components/ui/StatusBadge";

type AuditLog = {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
};

type Application = {
  id: string;
  applicationNumber: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
};

type FormSubmission = {
  id: string;
  formTemplateId: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
};

type SupportTicket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type Session = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
};

type EmailLog = {
  id: string;
  to: string;
  subject: string;
  status: string;
  createdAt: string;
};

type AccountDetail = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  roleLabel: string;
  isActive: boolean;
  createdAt: string;
  loginPath: string;
  firstLoginAt: string | null;
  activationDate: string;
  activityCounts: {
    applications: number;
    formSubmissions: number;
    supportTickets: number;
    assignedTickets: number;
    queries: number;
    notifications: number;
    sentMessages: number;
    receivedMessages: number;
    sessions: number;
    otps: number;
    emailLogs: number;
    auditLogs: number;
  };
  applications: Application[];
  formSubmissions: FormSubmission[];
  supportTickets: SupportTicket[];
  assignedTickets: SupportTicket[];
  queries: { id: string; question: string; answer: string | null; status: string; createdAt: string }[];
  notifications: Notification[];
  sentMessages: { id: string; recipientId: string; recipientName: string; message: string; createdAt: string }[];
  receivedMessages: { id: string; senderId: string; senderName: string; message: string; createdAt: string }[];
  sessions: Session[];
  otps: { id: string; type: string; expiresAt: string; verified: boolean; createdAt: string }[];
  emailLogs: EmailLog[];
  auditLogs: AuditLog[];
  verificationSessions: { id: string; status: string; createdAt: string }[];
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetch(`/api/admin/accounts/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setAccount(d.account);
        }
      })
      .catch(() => setError("Failed to load account"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="py-12 text-center text-gray-500">Loading account details...</p>;
  }

  if (error || !account) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error || "Account not found"}</p>
        <Link href="/admin/accounts" className="text-primary-600 underline">
          ← Back to accounts
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", count: null },
    { id: "applications", label: "Applications", count: account.activityCounts.applications },
    { id: "forms", label: "Form Submissions", count: account.activityCounts.formSubmissions },
    { id: "support", label: "Support", count: account.activityCounts.supportTickets },
    { id: "notifications", label: "Notifications", count: account.activityCounts.notifications },
    { id: "messages", label: "Messages", count: account.activityCounts.sentMessages + account.activityCounts.receivedMessages },
    { id: "activity", label: "Activity Log", count: account.activityCounts.auditLogs },
    { id: "sessions", label: "Sessions", count: account.activityCounts.sessions },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/accounts" className="text-sm text-primary-600 hover:underline">
            ← All Accounts
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{account.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            User ID: <span className="font-mono">{formatNumericId(account.userId)}</span>
            <span className="text-gray-300">|</span>
            {account.email}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
            account.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
          }`}
        >
          {account.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm text-gray-500">Account Created</p>
          <p className="text-lg font-semibold">{formatShortDate(account.createdAt)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">First Login</p>
          <p className="text-lg font-semibold">
            {account.firstLoginAt ? formatShortDate(account.firstLoginAt) : "Never"}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Role</p>
          <p className="text-lg font-semibold">{account.roleLabel}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Activity</p>
          <p className="text-lg font-semibold">
            {account.activityCounts.auditLogs} actions
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Account Info */}
            <div>
              <h3 className="mb-3 font-semibold">Account Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium">{account.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{account.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{account.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Login Portal</p>
                  <p className="font-medium font-mono text-sm">{account.loginPath}</p>
                </div>
              </div>
            </div>

            {/* Activity Summary */}
            <div>
              <h3 className="mb-3 font-semibold">Activity Summary</h3>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <StatCard label="Applications" value={account.activityCounts.applications} />
                <StatCard label="Form Submissions" value={account.activityCounts.formSubmissions} />
                <StatCard label="Support Tickets" value={account.activityCounts.supportTickets} />
                <StatCard label="Queries" value={account.activityCounts.queries} />
                <StatCard label="Notifications" value={account.activityCounts.notifications} />
                <StatCard label="Messages Sent" value={account.activityCounts.sentMessages} />
                <StatCard label="Messages Received" value={account.activityCounts.receivedMessages} />
                <StatCard label="Logins" value={account.activityCounts.sessions} />
                <StatCard label="Emails Sent" value={account.activityCounts.emailLogs} />
                <StatCard label="Audit Logs" value={account.activityCounts.auditLogs} />
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="mb-3 font-semibold">Recent Activity</h3>
              <div className="space-y-2">
                {account.auditLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div>
                      <p className="text-sm font-medium">{formatAction(log.action)}</p>
                      <p className="text-xs text-gray-500">
                        {log.details ? JSON.stringify(log.details).slice(0, 100) : ""}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(log.createdAt)}</p>
                  </div>
                ))}
                {account.auditLogs.length === 0 && (
                  <p className="text-sm text-gray-500">No activity recorded</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "applications" && (
          <div>
            {account.applications.length === 0 ? (
              <p className="text-gray-500">No applications submitted</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4">Application #</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Created</th>
                    <th className="pb-3 pr-4">Submitted</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {account.applications.map((app) => (
                    <tr key={app.id} className="border-b">
                      <td className="py-3 pr-4 font-mono text-xs">
                        {formatNumericId(app.applicationNumber)}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="py-3 pr-4">{formatShortDate(app.createdAt)}</td>
                      <td className="py-3 pr-4">
                        {app.submittedAt ? formatShortDate(app.submittedAt) : "—"}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="text-primary-600 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "forms" && (
          <div>
            {account.formSubmissions.length === 0 ? (
              <p className="text-gray-500">No form submissions</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4">Form ID</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Created</th>
                    <th className="pb-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {account.formSubmissions.map((form) => (
                    <tr key={form.id} className="border-b">
                      <td className="py-3 pr-4 font-mono text-xs">
                        {formatNumericId(form.formTemplateId)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`rounded px-2 py-0.5 text-xs ${
                          form.status === "SUBMITTED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                        }`}>
                          {form.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{formatShortDate(form.createdAt)}</td>
                      <td className="py-3">
                        {form.submittedAt ? formatShortDate(form.submittedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "support" && (
          <div>
            {account.supportTickets.length === 0 ? (
              <p className="text-gray-500">No support tickets</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4">Subject</th>
                    <th className="pb-3 pr-4">Priority</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {account.supportTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b">
                      <td className="py-3 pr-4">{ticket.subject}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded px-2 py-0.5 text-xs ${
                          ticket.priority === "HIGH" ? "bg-red-100 text-red-800" :
                          ticket.priority === "MEDIUM" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="py-3">{formatShortDate(ticket.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-3">
            {account.notifications.length === 0 ? (
              <p className="text-gray-500">No notifications</p>
            ) : (
              account.notifications.map((notif) => (
                <div key={notif.id} className={`rounded-lg p-4 ${
                  notif.read ? "bg-gray-50" : "bg-blue-50"
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{notif.title}</p>
                      <p className="mt-1 text-sm text-gray-600">{notif.message}</p>
                      <p className="mt-2 text-xs text-gray-400">{formatDate(notif.createdAt)}</p>
                    </div>
                    {!notif.read && (
                      <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">New</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "messages" && (
          <div className="space-y-6">
            <div>
              <h4 className="mb-3 font-medium">Sent Messages ({account.sentMessages.length})</h4>
              {account.sentMessages.length === 0 ? (
                <p className="text-sm text-gray-500">No messages sent</p>
              ) : (
                <div className="space-y-2">
                  {account.sentMessages.map((msg) => (
                    <div key={msg.id} className="rounded-lg bg-gray-50 p-3">
                      <p className="text-sm">{msg.message.slice(0, 100)}{msg.message.length > 100 ? "..." : ""}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        To: {msg.recipientName} | {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="mb-3 font-medium">Received Messages ({account.receivedMessages.length})</h4>
              {account.receivedMessages.length === 0 ? (
                <p className="text-sm text-gray-500">No messages received</p>
              ) : (
                <div className="space-y-2">
                  {account.receivedMessages.map((msg) => (
                    <div key={msg.id} className="rounded-lg bg-blue-50 p-3">
                      <p className="text-sm">{msg.message.slice(0, 100)}{msg.message.length > 100 ? "..." : ""}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        From: {msg.senderName} | {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-3">
            {account.auditLogs.length === 0 ? (
              <p className="text-gray-500">No activity recorded</p>
            ) : (
              account.auditLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between rounded-lg bg-gray-50 p-4">
                  <div>
                    <p className="font-medium">{formatAction(log.action)}</p>
                    {log.details && (
                      <p className="mt-1 text-sm text-gray-600">
                        {JSON.stringify(log.details, null, 0).slice(0, 200)}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 whitespace-nowrap ml-4">{formatDate(log.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "sessions" && (
          <div>
            {account.sessions.length === 0 ? (
              <p className="text-gray-500">No login sessions</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">IP Address</th>
                    <th className="pb-3">Login Time</th>
                  </tr>
                </thead>
                <tbody>
                  {account.sessions.map((session, i) => (
                    <tr key={session.id} className="border-b">
                      <td className="py-3 pr-4">{i + 1}</td>
                      <td className="py-3 pr-4 font-mono text-xs">{session.ipAddress || "—"}</td>
                      <td className="py-3">{formatDate(session.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    LOGIN: "Logged in",
    LOGOUT: "Logged out",
    APPLICATION_SUBMITTED: "Submitted application",
    APPLICATION_UPDATED: "Updated application",
    BULK_EMAIL_SENT: "Sent bulk email",
    SUPPORT_TICKET_CREATED: "Created support ticket",
    SUPPORT_TICKET_REPLIED: "Replied to support ticket",
    PASSWORD_CHANGED: "Changed password",
    PROFILE_UPDATED: "Updated profile",
    DOCUMENT_UPLOADED: "Uploaded document",
    EMAIL_SENT: "Sent email",
    SMS_SENT: "Sent SMS",
    WHATSAPP_SENT: "Sent WhatsApp message",
    VERIFICATION_INITIATED: "Initiated verification",
    VERIFICATION_COMPLETED: "Completed verification",
    OTP_GENERATED: "Generated OTP",
    OTP_VERIFIED: "Verified OTP",
    UNDERTAKING_GENERATED: "Generated undertaking",
    UNDERTAKING_SIGNED: "Signed undertaking",
    FELLOWSHIP_CREATED: "Created fellowship",
    FELLOWSHIP_UPDATED: "Updated fellowship",
    STAGE_ADVANCED: "Advanced fellowship stage",
  };
  return actionMap[action] || action.replace(/_/g, " ");
}
