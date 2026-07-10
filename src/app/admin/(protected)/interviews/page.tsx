"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  Loader2,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Eye,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";

interface Interview {
  id: string;
  applicationId: string;
  interviewType: "ONLINE" | "IN_PERSON";
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  meetingLink: string | null;
  location: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  panelMembers: string;
  status: string;
  feedback: string | null;
  notes: string | null;
  application: {
    id: string;
    applicationNumber: string;
    name: string;
    email: string;
    mobile: string;
    status: string;
  };
}

interface Application {
  id: string;
  applicationNumber: string;
  name: string;
  email: string;
  mobile: string;
  status: string;
}

export default function AdminInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Available applications for scheduling
  const [availableApplications, setAvailableApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  // Form states
  const [interviewType, setInterviewType] = useState<"ONLINE" | "IN_PERSON">("ONLINE");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [panelMembers, setPanelMembers] = useState("");
  const [notes, setNotes] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter states
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadInterviews();
  }, []);

  async function loadInterviews() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/interviews");
      const data = await res.json();
      if (res.ok) {
        setInterviews(data.interviews || []);
      } else {
        setError(data.error || "Failed to load interviews");
      }
    } catch {
      setError("Failed to load interviews");
    }
    setLoading(false);
  }

  async function loadAvailableApplications() {
    setLoadingApplications(true);
    try {
      // Fetch applications that are shortlisted
      const res = await fetch("/api/admin/applications?status=SHORTLISTED");
      const data = await res.json();
      if (res.ok) {
        // Filter out applications that already have scheduled interviews
        const scheduledAppIds = interviews.map((i) => i.applicationId);
        const available = (data.applications || []).filter(
          (app: Application) => !scheduledAppIds.includes(app.id)
        );
        setAvailableApplications(available);
      }
    } catch {
      console.error("Failed to load applications");
    }
    setLoadingApplications(false);
  }

  function openScheduleModal(application?: Application) {
    resetForm();
    if (application) {
      setSelectedApplication(application);
    }
    loadAvailableApplications();
    setShowScheduleModal(true);
  }

  function openRescheduleModal(interview: Interview) {
    setSelectedInterview(interview);
    setScheduledDate(interview.scheduledDate.split("T")[0]);
    setScheduledTime(interview.scheduledTime);
    setDurationMinutes(String(interview.durationMinutes));
    setShowRescheduleModal(true);
  }

  function openCancelModal(interview: Interview) {
    setSelectedInterview(interview);
    setCancellationReason("");
    setShowCancelModal(true);
  }

  function resetForm() {
    setInterviewType("ONLINE");
    setScheduledDate("");
    setScheduledTime("");
    setDurationMinutes("30");
    setLocation("");
    setAddress("");
    setGoogleMapsUrl("");
    setPanelMembers("");
    setNotes("");
    setCancellationReason("");
    setSelectedApplication(null);
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedApplication?.id,
          interviewType,
          scheduledDate,
          scheduledTime,
          durationMinutes: parseInt(durationMinutes),
          location: interviewType === "IN_PERSON" ? location : undefined,
          address: interviewType === "IN_PERSON" ? address : undefined,
          googleMapsUrl: interviewType === "IN_PERSON" ? googleMapsUrl : undefined,
          panelMembers,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to schedule interview");
        return;
      }

      setSuccess("Interview scheduled successfully!");
      setShowScheduleModal(false);
      resetForm();
      loadInterviews();
    } catch {
      setError("Failed to schedule interview");
    }

    setSaving(false);
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/interviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedInterview?.applicationId,
          action: "reschedule",
          scheduledDate,
          scheduledTime,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reschedule interview");
        return;
      }

      setSuccess("Interview rescheduled successfully!");
      setShowRescheduleModal(false);
      resetForm();
      loadInterviews();
    } catch {
      setError("Failed to reschedule interview");
    }

    setSaving(false);
  }

  async function handleCancel() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/interviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedInterview?.applicationId,
          action: "cancel",
          cancellationReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to cancel interview");
        return;
      }

      setSuccess("Interview cancelled successfully!");
      setShowCancelModal(false);
      resetForm();
      loadInterviews();
    } catch {
      setError("Failed to cancel interview");
    }

    setSaving(false);
  }

  async function handleComplete(interview: Interview) {
    if (!window.confirm("Mark this interview as completed?")) return;

    try {
      const res = await fetch("/api/admin/interviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: interview.applicationId,
          action: "complete",
        }),
      });

      if (res.ok) {
        setSuccess("Interview marked as completed!");
        loadInterviews();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to complete interview");
      }
    } catch {
      setError("Failed to complete interview");
    }
  }

  async function handleNoShow(interview: Interview) {
    if (!window.confirm("Mark this applicant as no-show?")) return;

    try {
      const res = await fetch("/api/admin/interviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: interview.applicationId,
          action: "no_show",
        }),
      });

      if (res.ok) {
        setSuccess("Applicant marked as no-show!");
        loadInterviews();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to mark no-show");
      }
    } catch {
      setError("Failed to mark no-show");
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const filteredInterviews = interviews.filter((interview) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "today") {
      const today = new Date().toISOString().split("T")[0];
      return interview.scheduledDate.split("T")[0] === today;
    }
    return interview.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Management</h1>
          <p className="mt-1 text-gray-600">
            Schedule and manage fellowship interviews
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => loadInterviews()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            type="button"
            onClick={() => openScheduleModal()}
          >
            <Plus className="h-4 w-4" />
            Schedule Interview
          </Button>
        </div>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-800">
            <XCircle className="h-5 w-5" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={[
            { value: "all", label: "All Interviews" },
            { value: "today", label: "Today's Interviews" },
            { value: "SCHEDULED", label: "Scheduled" },
            { value: "RESCHEDULED", label: "Rescheduled" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
            { value: "NO_SHOW", label: "No Show" },
          ]}
        />
      </div>

      {/* Interviews List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No interviews found
                  </td>
                </tr>
              ) : (
                filteredInterviews.map((interview) => (
                  <tr key={interview.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{interview.application.name}</p>
                        <p className="text-xs text-gray-500">
                          {interview.application.applicationNumber}
                        </p>
                        <p className="text-xs text-gray-500">{interview.application.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {interview.interviewType === "ONLINE" ? (
                          <Video className="h-4 w-4 text-blue-600" />
                        ) : (
                          <MapPin className="h-4 w-4 text-green-600" />
                        )}
                        <span className="text-xs">
                          {interview.interviewType === "ONLINE" ? "Online" : "In-Person"}
                        </span>
                        {interview.interviewType === "IN_PERSON" && interview.location && (
                          <p className="text-xs text-gray-500">{interview.location}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(interview.scheduledDate)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{interview.scheduledTime}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {interview.durationMinutes} min
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={interview.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {interview.status === "SCHEDULED" || interview.status === "RESCHEDULED" ? (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              className="text-xs"
                              onClick={() => openRescheduleModal(interview)}
                            >
                              <CalendarClock className="h-3 w-3" />
                              Reschedule
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="text-xs"
                              onClick={() => openCancelModal(interview)}
                            >
                              <X className="h-3 w-3" />
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="text-xs text-green-600"
                              onClick={() => handleComplete(interview)}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Complete
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="text-xs text-orange-600"
                              onClick={() => handleNoShow(interview)}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              No-Show
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Interview Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Schedule Interview</h2>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSchedule} className="space-y-4">
              {/* Application Selection */}
              {!selectedApplication && (
                <div>
                  <label className="label-field">Select Applicant</label>
                  <select
                    className="input-field"
                    value={selectedApplication?.id || ""}
                    onChange={(e) => {
                      const app = availableApplications.find((a) => a.id === e.target.value);
                      setSelectedApplication(app || null);
                    }}
                    required
                  >
                    <option value="">Select an application...</option>
                    {availableApplications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name} - {app.applicationNumber} ({app.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedApplication && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="font-medium">{selectedApplication.name}</p>
                  <p className="text-sm text-gray-500">{selectedApplication.applicationNumber}</p>
                  <p className="text-sm text-gray-500">{selectedApplication.email}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedApplication(null)}
                    className="mt-2 text-sm text-primary-600 hover:underline"
                  >
                    Change applicant
                  </button>
                </div>
              )}

              {/* Interview Type */}
              <div>
                <label className="label-field">Interview Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="interviewType"
                      value="ONLINE"
                      checked={interviewType === "ONLINE"}
                      onChange={() => setInterviewType("ONLINE")}
                      className="h-4 w-4 text-primary-600"
                    />
                    <Video className="h-4 w-4 text-blue-600" />
                    <span>Online</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="interviewType"
                      value="IN_PERSON"
                      checked={interviewType === "IN_PERSON"}
                      onChange={() => setInterviewType("IN_PERSON")}
                      className="h-4 w-4 text-primary-600"
                    />
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span>In-Person</span>
                  </label>
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
                <Input
                  label="Time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
              </div>

              {/* Duration */}
              <Select
                label="Duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                options={[
                  { value: "15", label: "15 minutes" },
                  { value: "30", label: "30 minutes" },
                  { value: "45", label: "45 minutes" },
                  { value: "60", label: "60 minutes" },
                  { value: "90", label: "90 minutes" },
                ]}
              />

              {/* In-Person Location Fields */}
              {interviewType === "IN_PERSON" && (
                <>
                  <Input
                    label="Venue/Location Name"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., VGMF Office, Room 101"
                    required
                  />
                  <Textarea
                    label="Full Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter complete address for the interview venue"
                    rows={3}
                  />
                  <Input
                    label="Google Maps URL (optional)"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                  />
                </>
              )}

              {/* Panel Members */}
              <Input
                label="Panel Members"
                value={panelMembers}
                onChange={(e) => setPanelMembers(e.target.value)}
                placeholder="e.g., Dr. Smith, Dr. Johnson"
                required
              />

              {/* Notes */}
              <Textarea
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes for the interview..."
                rows={3}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  <Calendar className="h-4 w-4" />
                  Schedule Interview
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Reschedule Interview</h2>
              <button onClick={() => setShowRescheduleModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm">
              <p className="font-medium text-yellow-800">Previous Schedule:</p>
              <p className="text-yellow-700">
                {formatDate(selectedInterview.scheduledDate)} at {selectedInterview.scheduledTime}
              </p>
            </div>

            <form onSubmit={handleReschedule} className="space-y-4">
              <Input
                label="New Date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
              <Input
                label="New Time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowRescheduleModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  <RefreshCw className="h-4 w-4" />
                  Reschedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-red-600">Cancel Interview</h2>
              <button onClick={() => setShowCancelModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-medium">Interview with:</p>
              <p>{selectedInterview.application.name}</p>
              <p className="text-gray-500">
                {formatDate(selectedInterview.scheduledDate)} at {selectedInterview.scheduledTime}
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                label="Reason for Cancellation (optional)"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Enter reason for cancelling this interview..."
                rows={3}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCancelModal(false)}
                >
                  Keep Interview
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleCancel}
                  loading={saving}
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Interview
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
