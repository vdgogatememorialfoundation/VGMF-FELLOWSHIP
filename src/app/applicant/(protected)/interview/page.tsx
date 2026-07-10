"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Video,
  MapPin,
  Calendar,
  Clock,
  Users,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Map,
  FileText,
  RefreshCw,
} from "lucide-react";

interface InterviewData {
  id: string;
  applicationId: string;
  applicationNumber: string;
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
  notes: string | null;
}

interface AccessInfo {
  isAccessible: boolean;
  minutesUntilAccess: number;
  minutesUntilMeeting: number;
  accessTime: string;
  meetingStartTime: string;
  linkAccessMinutes: number;
}

export default function ApplicantInterviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [countdown, setCountdown] = useState("");
  const [timeUntilMeeting, setTimeUntilMeeting] = useState("");

  const fetchInterview = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/applicant/interview");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load interview");
        setInterview(null);
        setAccessInfo(null);
      } else {
        setInterview(data.interview);
        setAccessInfo(data.accessInfo);
      }
    } catch {
      setError("Failed to load interview details");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInterview();
  }, [fetchInterview]);

  // Countdown timer
  useEffect(() => {
    if (!accessInfo) return;

    const updateCountdown = () => {
      const now = new Date();
      const accessTime = new Date(accessInfo.accessTime);
      const meetingTime = new Date(accessInfo.meetingStartTime);

      // Countdown to access time
      if (!accessInfo.isAccessible) {
        const diffMs = accessTime.getTime() - now.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        setCountdown(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
      } else {
        setCountdown("00:00:00");
      }

      // Time until meeting starts
      const meetDiffMs = meetingTime.getTime() - now.getTime();
      if (meetDiffMs > 0) {
        const hours = Math.floor(meetDiffMs / (1000 * 60 * 60));
        const mins = Math.floor((meetDiffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((meetDiffMs % (1000 * 60)) / 1000);
        setTimeUntilMeeting(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
      } else {
        setTimeUntilMeeting("00:00:00");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [accessInfo]);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function getMeetingEndTime(): string {
    if (!interview) return "";
    const [hours, minutes] = interview.scheduledTime.split(":").map(Number);
    const endDate = new Date(interview.scheduledDate);
    endDate.setHours(hours, minutes, 0, 0);
    endDate.setMinutes(endDate.getMinutes() + interview.durationMinutes);
    return `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="space-y-6">
        <div className="card p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">No Interview Scheduled</h2>
          <p className="mt-2 text-gray-600">
            {error || "You don't have any interviews scheduled at the moment."}
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link href="/applicant/status">
              <Button variant="secondary">
                <FileText className="h-4 w-4" />
                View Application Status
              </Button>
            </Link>
            <Button onClick={fetchInterview}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Interview</h1>
          <p className="mt-1 text-gray-600">
            Application: {interview.applicationNumber}
          </p>
        </div>
        <Button variant="secondary" onClick={fetchInterview}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Interview Not Accessible Yet */}
      {!accessInfo?.isAccessible && interview.interviewType === "ONLINE" && (
        <div className="card border-2 border-yellow-200 bg-yellow-50 p-6">
          <div className="flex items-center gap-3 text-yellow-800">
            <Clock className="h-8 w-8" />
            <div>
              <h3 className="text-lg font-semibold">Meeting Link Not Yet Available</h3>
              <p className="text-sm">
                The meeting link will be accessible {accessInfo?.linkAccessMinutes} minutes before your scheduled time.
              </p>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-yellow-700">Countdown to access meeting link:</p>
            <div className="mt-2 text-5xl font-bold tabular-nums text-yellow-900">
              {countdown}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-white p-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-5 w-5" />
                <span>Date</span>
              </div>
              <p className="mt-1 font-semibold">{formatDate(interview.scheduledDate)}</p>
            </div>
            <div className="rounded-lg bg-white p-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-5 w-5" />
                <span>Time</span>
              </div>
              <p className="mt-1 font-semibold">
                {interview.scheduledTime} - {getMeetingEndTime()}
              </p>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-yellow-700">
            Time until interview starts: <span className="font-mono font-bold">{timeUntilMeeting}</span>
          </p>
        </div>
      )}

      {/* Interview Accessible / In-Person Interview */}
      {(accessInfo?.isAccessible || interview.interviewType === "IN_PERSON") && (
        <>
          {/* Time Until Meeting */}
          {accessInfo?.isAccessible && accessInfo.minutesUntilMeeting > 0 && (
            <div className="card border-2 border-green-200 bg-green-50 p-6">
              <div className="flex items-center gap-3 text-green-800">
                <CheckCircle2 className="h-8 w-8" />
                <div>
                  <h3 className="text-lg font-semibold">Meeting Link Available!</h3>
                  <p className="text-sm">
                    Your meeting link is ready. Please join on time.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-green-700">Time until interview starts:</p>
                <div className="mt-2 text-5xl font-bold tabular-nums text-green-900">
                  {timeUntilMeeting}
                </div>
              </div>
            </div>
          )}

          {/* Meeting Details */}
          <div className="card overflow-hidden">
            <div className={`p-4 ${interview.interviewType === "ONLINE" ? "bg-blue-600" : "bg-green-600"} text-white`}>
              <div className="flex items-center gap-3">
                {interview.interviewType === "ONLINE" ? (
                  <Video className="h-6 w-6" />
                ) : (
                  <MapPin className="h-6 w-6" />
                )}
                <div>
                  <h2 className="text-lg font-semibold">
                    {interview.interviewType === "ONLINE" ? "Online Interview" : "In-Person Interview"}
                  </h2>
                  <p className="text-sm opacity-90">
                    Duration: {interview.durationMinutes} minutes
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Date and Time */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-1 h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-500">Date</p>
                      <p className="text-lg font-semibold">{formatDate(interview.scheduledDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-1 h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-500">Time</p>
                      <p className="text-lg font-semibold">
                        {interview.scheduledTime} - {getMeetingEndTime()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location / Meeting Link */}
                <div className="space-y-4">
                  {interview.interviewType === "ONLINE" ? (
                    <>
                      <div className="flex items-start gap-3">
                        <Video className="mt-1 h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-500">Meeting Platform</p>
                          <p className="font-semibold">Video Conference</p>
                        </div>
                      </div>
                      {interview.meetingLink && accessInfo?.isAccessible && (
                        <a
                          href={interview.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
                        >
                          <ExternalLink className="h-5 w-5" />
                          Join Video Meeting
                        </a>
                      )}
                      {interview.meetingLink && !accessInfo?.isAccessible && (
                        <div className="mt-4 rounded-lg bg-gray-100 p-4 text-center">
                          <p className="text-sm text-gray-600">
                            Meeting link will appear here when it's time to join
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-1 h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-500">Venue</p>
                          <p className="font-semibold">{interview.location || "Location to be confirmed"}</p>
                          {interview.address && (
                            <p className="mt-1 text-sm text-gray-600">{interview.address}</p>
                          )}
                        </div>
                      </div>
                      {interview.googleMapsUrl && (
                        <a
                          href={interview.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
                        >
                          <Map className="h-5 w-5" />
                          Open in Google Maps
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Panel Members */}
              <div className="mt-6 border-t pt-6">
                <div className="flex items-start gap-3">
                  <Users className="mt-1 h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-500">Panel Members</p>
                    <p className="font-semibold">{interview.panelMembers}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {interview.notes && (
                <div className="mt-6 border-t pt-6">
                  <p className="font-medium text-gray-500">Additional Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-700">{interview.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pre-Interview Checklist */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold">Pre-Interview Checklist</h3>
            <ul className="mt-4 space-y-3">
              {interview.interviewType === "ONLINE" ? (
                <>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Ensure you have a stable internet connection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Test your camera and microphone before the call</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Find a quiet, well-lit place for the interview</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Have your original documents ready for verification</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Carry a valid government-issued ID</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Reach the venue 15 minutes early</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Carry copies of your academic documents</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Dress professionally</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </>
      )}

      {/* Help Section */}
      <div className="card bg-gray-50 p-6">
        <h3 className="font-semibold">Need Help?</h3>
        <p className="mt-1 text-sm text-gray-600">
          If you have any questions or issues with your interview, please contact support.
        </p>
        <Link href="/applicant/support" className="mt-4 inline-block">
          <Button variant="secondary">
            <FileText className="h-4 w-4" />
            Contact Support
          </Button>
        </Link>
      </div>
    </div>
  );
}
