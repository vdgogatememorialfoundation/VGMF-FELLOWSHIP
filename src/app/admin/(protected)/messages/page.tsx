"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Send,
  Search,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Info,
  X,
} from "lucide-react";

interface Application {
  id: string;
  applicationNumber: string;
  name: string;
  email: string;
  mobile: string | null;
  status: string;
  submittedAt: string | null;
  fellowship: {
    id: string;
    fellowshipId: string;
    fellowName: string;
  } | null;
}

interface SendResult {
  id: string;
  name: string;
  email: string;
  ok: boolean;
  error?: string;
}

const TEMPLATE_OPTIONS = [
  { value: "", label: "Custom Message" },
  { value: "interview_invite", label: "Interview Invitation" },
  { value: "status_update", label: "Status Update" },
  { value: "document_request", label: "Document Request" },
  { value: "fellowship_offer", label: "Fellowship Offer" },
  { value: "general", label: "General Communication" },
];

const TEMPLATE_MESSAGES: Record<string, { subject: string; message: string }> = {
  interview_invite: {
    subject: "Interview Invitation - VGMF Fellowship",
    message: `We are pleased to invite you for an interview for your fellowship application.

Date: {{date}}
Time: {{time}}
Venue/Link: {{venue}}

Please ensure you are available at the scheduled time. If you have any questions, please contact us through the support portal.

Best regards,
VGMF Team`,
  },
  status_update: {
    subject: "Application Status Update - {{applicationNumber}}",
    message: `Dear {{name}},

We are writing to inform you about an update to your fellowship application ({{applicationNumber}}).

Your application is currently under review. We will notify you of further updates.

For any queries, please use the support portal.

Best regards,
VGMF Team`,
  },
  document_request: {
    subject: "Document Request - {{applicationNumber}}",
    message: `Dear {{name}},

We require additional documents for your fellowship application ({{applicationNumber}}).

Please log in to the fellowship portal to view the list of required documents and submit them at your earliest convenience.

Best regards,
VGMF Team`,
  },
  fellowship_offer: {
    subject: "Fellowship Offer - {{fellowshipId}}",
    message: `Dear {{name}},

Congratulations! We are pleased to offer you a fellowship under our program.

Fellowship ID: {{fellowshipId}}

Please log in to the fellowship portal to review the agreement and complete the acceptance process.

Best regards,
VGMF Team`,
  },
  general: {
    subject: "Communication from VGMF Fellowship",
    message: `Dear {{name}},

We hope this message finds you well.

{{message}}

Best regards,
VGMF Fellowship Team`,
  },
};

export default function AdminMessagesPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fellowshipFilter, setFellowshipFilter] = useState("");
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSelectAll, setShowSelectAll] = useState(false);
  
  // Message composition
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [results, setResults] = useState<SendResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [search, statusFilter, fellowshipFilter]);

  async function fetchApplications() {
    setLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (fellowshipFilter) params.set("fellowshipId", fellowshipFilter);
      
      const res = await fetch(`/api/admin/messages?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setApplications(data.applications);
      setStatusCounts(data.statusCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
    
    setLoading(false);
  }

  function handleTemplateChange(template: string) {
    setSelectedTemplate(template);
    
    if (template && TEMPLATE_MESSAGES[template]) {
      setSubject(TEMPLATE_MESSAGES[template].subject);
      setMessage(TEMPLATE_MESSAGES[template].message);
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedIds(applications.map((a) => a.id));
  }

  function deselectAll() {
    setSelectedIds([]);
  }

  async function sendMessages() {
    if (selectedIds.length === 0) {
      setError("Please select at least one recipient");
      return;
    }
    
    if (!subject.trim()) {
      setError("Please enter a subject");
      return;
    }
    
    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");
    setShowResults(false);

    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientIds: selectedIds,
          subject: subject.trim(),
          message: message.trim(),
          template: selectedTemplate,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setResults(data.results);
      setShowResults(true);
      setSuccess(data.message);
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send messages");
    }

    setSending(false);
  }

  const selectedApplications = applications.filter((a) => selectedIds.includes(a.id));
  const statusOptions = Object.entries(statusCounts).map(([status, count]) => ({
    value: status,
    label: `${status.replace(/_/g, " ")} (${count})`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Send Messages</h1>
        <p className="mt-1 text-gray-600">
          Send email messages to applicants individually or in bulk
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-800">
            <XCircle className="h-5 w-5" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">{success}</span>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Recipient Selection */}
        <div className="space-y-4">
          <div className="card">
            <div className="border-b p-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Recipients
              </h2>
            </div>
            
            {/* Filters */}
            <div className="p-4 border-b space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, email, or app number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: "", label: "All Statuses" },
                    ...statusOptions,
                  ]}
                  className="flex-1"
                />
                <Select
                  value={fellowshipFilter}
                  onChange={(e) => setFellowshipFilter(e.target.value)}
                  options={[
                    { value: "", label: "All Applications" },
                    { value: "has_fellowship", label: "Has Fellowship" },
                    { value: "no_fellowship", label: "No Fellowship" },
                  ]}
                  className="flex-1"
                />
              </div>
            </div>
            
            {/* Selection Actions */}
            <div className="p-3 bg-gray-50 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedIds.length} of {applications.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-primary-600 hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={deselectAll}
                  className="text-xs text-primary-600 hover:underline"
                >
                  Deselect
                </button>
              </div>
            </div>
            
            {/* Recipient List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : applications.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No applicants found
                </div>
              ) : (
                <div className="divide-y">
                  {applications.map((app) => (
                    <label
                      key={app.id}
                      className={`flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer ${
                        selectedIds.includes(app.id) ? "bg-primary-50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(app.id)}
                        onChange={() => toggleSelection(app.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{app.name}</p>
                          <StatusBadge status={app.status} />
                        </div>
                        <p className="text-sm text-gray-500 truncate">{app.email}</p>
                        <p className="text-xs text-gray-400">{app.applicationNumber}</p>
                      </div>
                      {app.fellowship && (
                        <span className="badge bg-green-100 text-green-700 text-xs">
                          Fellow
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Message Composition */}
        <div className="space-y-4">
          {/* Selected Recipients Summary */}
          {selectedIds.length > 0 && (
            <div className="card bg-primary-50 border-primary-200">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-primary-900">
                    {selectedIds.length} Recipient{selectedIds.length > 1 ? "s" : ""} Selected
                  </h3>
                  <button
                    onClick={() => setShowSelectAll(!showSelectAll)}
                    className="text-xs text-primary-700 hover:underline"
                  >
                    {showSelectAll ? "Hide" : "Show"} list
                  </button>
                </div>
                
                {showSelectAll && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {selectedApplications.map((app) => (
                      <div key={app.id} className="text-sm text-primary-800 flex items-center gap-2">
                        <span>{app.name}</span>
                        <span className="text-primary-600">({app.email})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card">
            <div className="border-b p-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Compose Message
              </h2>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Template Selection */}
              <div>
                <label className="label-field">Message Template</label>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  options={TEMPLATE_OPTIONS}
                />
              </div>
              
              {/* Subject */}
              <Input
                label="Subject *"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
              />
              
              {/* Message */}
              <div>
                <Textarea
                  label="Message *"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message... Use {{name}}, {{applicationNumber}}, {{fellowshipId}} for placeholders."
                  rows={10}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Available placeholders: {"{{name}}"}, {"{{applicationNumber}}"}, {"{{fellowshipId}}"}, {"{{date}}"}, {"{{time}}"}, {"{{venue}}"}
                </p>
              </div>
              
              {/* Info Box */}
              <div className="rounded-lg bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Email will be sent as:</p>
                    <p className="mt-1">[VGMF Fellowship] {subject || "(subject)"}</p>
                  </div>
                </div>
              </div>
              
              {/* Send Button */}
              <Button
                onClick={sendMessages}
                loading={sending}
                disabled={selectedIds.length === 0 || !subject.trim() || !message.trim()}
                className="w-full"
                size="lg"
              >
                <Send className="h-4 w-4" />
                Send to {selectedIds.length} Recipient{selectedIds.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>

          {/* Results */}
          {showResults && results.length > 0 && (
            <div className="card">
              <div className="border-b p-4 flex items-center justify-between">
                <h2 className="font-semibold">Send Results</h2>
                <button
                  onClick={() => setShowResults(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y">
                {results.map((result) => (
                  <div key={result.id} className="p-3 flex items-center gap-3">
                    {result.ok ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{result.name}</p>
                      <p className="text-sm text-gray-500 truncate">{result.email}</p>
                      {result.error && (
                        <p className="text-xs text-red-600">{result.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
