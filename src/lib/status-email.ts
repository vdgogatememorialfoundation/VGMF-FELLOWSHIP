import { getLifecycleStatusLabel } from "./lifecycle-workflow";

/** Application statuses that trigger a detailed applicant email (not every admin transition). */
export const MAIN_STATUS_EMAIL_STATUSES = new Set([
  "SCRUTINY_APPROVED",
  "ELIGIBLE",
  "CONDITIONALLY_ELIGIBLE",
  "NOT_ELIGIBLE",
  "SHORTLISTED",
  "WAITLISTED",
  "REJECTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "SELECTED",
  "AGREEMENT_PENDING",
  "COMPLETED",
  "WITHDRAWN",
  "SUSPENDED",
  "TERMINATED",
]);

export function shouldSendMainStatusEmail(
  fromStatus: string | undefined,
  toStatus: string
): boolean {
  if (fromStatus === toStatus) return false;
  if (toStatus === "SUBMITTED") return false;
  return MAIN_STATUS_EMAIL_STATUSES.has(toStatus);
}

export type StatusEmailTone = "success" | "info" | "warning" | "neutral";

export type StatusEmailContent = {
  subject: string;
  headline: string;
  summary: string;
  details: string[];
  nextSteps: string[];
  tone: StatusEmailTone;
};

const STATUS_EMAIL_CONTENT: Record<string, Omit<StatusEmailContent, "subject">> = {
  SCRUTINY_APPROVED: {
    headline: "Documents Verified",
    summary:
      "Our verification team has reviewed and approved the documents submitted with your fellowship application.",
    details: [
      "All mandatory documents in your application have passed initial verification.",
      "Your application will now proceed to eligibility assessment.",
      "You do not need to re-upload documents unless we request additional information.",
    ],
    nextSteps: [
      "Track progress anytime from your applicant dashboard.",
      "Watch for the next email when eligibility review is complete.",
      "Ensure your contact details in the portal remain up to date.",
    ],
    tone: "success",
  },
  ELIGIBLE: {
    headline: "Eligibility Approved",
    summary:
      "Congratulations — you meet the eligibility criteria for the VGMF Research Fellowship.",
    details: [
      "Your academic credentials, registration details, and application profile satisfy fellowship requirements.",
      "Your proposal will now enter the research committee evaluation stage.",
      "Committee members will review your research topic, methodology, and budget.",
    ],
    nextSteps: [
      "No action is required at this stage unless the committee raises a query.",
      "Check your portal regularly for committee updates and messages.",
      "Prepare for a possible interview if your application is shortlisted.",
    ],
    tone: "success",
  },
  CONDITIONALLY_ELIGIBLE: {
    headline: "Conditionally Eligible",
    summary:
      "You are eligible to proceed subject to fulfilling specific conditions noted by the review team.",
    details: [
      "Your application meets most fellowship criteria but requires one or more conditions to be satisfied.",
      "Please review any messages or document requests in your applicant portal.",
      "Final eligibility will be confirmed once the stated conditions are met.",
    ],
    nextSteps: [
      "Log in and check your application dashboard for pending actions.",
      "Upload any requested documents or clarifications promptly.",
      "Contact support through the portal if you need clarification on the conditions.",
    ],
    tone: "info",
  },
  NOT_ELIGIBLE: {
    headline: "Not Eligible",
    summary:
      "After eligibility review, your application does not meet the fellowship criteria at this time.",
    details: [
      "This decision is based on the eligibility requirements published in the fellowship rulebook.",
      "Your application will not proceed to committee review.",
      "You may review the rulebook on the portal for detailed eligibility criteria.",
    ],
    nextSteps: [
      "View your application status and any admin notes in the portal.",
      "Contact the fellowship office through the support section if you have questions.",
    ],
    tone: "warning",
  },
  SHORTLISTED: {
    headline: "Application Shortlisted",
    summary:
      "Congratulations — your application has been shortlisted by the research committee.",
    details: [
      "Your research proposal, methodology, and supporting documents were evaluated favourably.",
      "Shortlisted candidates may be invited for an interview or further review.",
      "This is an important milestone in the selection process.",
    ],
    nextSteps: [
      "Watch for an interview schedule notification by email and in the portal.",
      "Keep your phone and email accessible for communication from the foundation.",
      "Review your proposal summary in case interview questions relate to your research plan.",
    ],
    tone: "success",
  },
  WAITLISTED: {
    headline: "Application Waitlisted",
    summary:
      "Your application remains under consideration on the fellowship waitlist.",
    details: [
      "You were not selected in the current shortlist batch but remain a potential candidate.",
      "Waitlisted applications may be activated if selected candidates withdraw or decline.",
      "Your application status will be updated if a fellowship seat becomes available.",
    ],
    nextSteps: [
      "Monitor your portal and email for any status change.",
      "No immediate action is required unless we contact you.",
    ],
    tone: "info",
  },
  REJECTED: {
    headline: "Application Not Selected",
    summary:
      "We regret to inform you that your application was not selected for the fellowship at this stage.",
    details: [
      "The research committee completed its evaluation and your application was not advanced further.",
      "Selection is highly competitive and limited by available fellowship seats.",
      "We sincerely appreciate the time and effort you invested in your application.",
    ],
    nextSteps: [
      "You may view your application record in the portal for your reference.",
      "We encourage you to apply again in a future fellowship cycle if eligible.",
    ],
    tone: "warning",
  },
  INTERVIEW_SCHEDULED: {
    headline: "Interview Scheduled",
    summary: "An interview has been scheduled for your fellowship application.",
    details: [
      "You have been invited to attend a fellowship selection interview.",
      "Interview details including date, time, and meeting link are available in your portal.",
      "Please attend punctually and be prepared to discuss your research proposal.",
    ],
    nextSteps: [
      "Open your applicant dashboard to view the full interview schedule.",
      "Test your internet connection and meeting link in advance if the interview is online.",
      "Keep a copy of your proposal and key documents ready for reference.",
    ],
    tone: "info",
  },
  INTERVIEW_COMPLETED: {
    headline: "Interview Completed",
    summary: "Your fellowship interview has been marked as completed.",
    details: [
      "Thank you for attending the selection interview.",
      "Your interview performance will be considered along with your application materials.",
      "The selection committee will now proceed with final evaluation.",
    ],
    nextSteps: [
      "Await the final selection decision — you will be notified by email and in the portal.",
      "No further action is required unless the committee requests additional information.",
    ],
    tone: "info",
  },
  SELECTED: {
    headline: "Fellowship Selection — Congratulations!",
    summary:
      "We are delighted to inform you that you have been selected for the VGMF Research Fellowship.",
    details: [
      "Your application successfully completed all review and selection stages.",
      "You will receive instructions to complete the fellowship agreement and onboarding steps.",
      "The sanctioned fellowship grant and disbursement schedule will be shared through the portal.",
    ],
    nextSteps: [
      "Log in to the applicant portal and complete fellowship onboarding steps.",
      "Review and sign the fellowship agreement when it becomes available.",
      "Submit bank details and any documents requested for fellowship sanction.",
    ],
    tone: "success",
  },
  AGREEMENT_PENDING: {
    headline: "Fellowship Agreement Pending",
    summary:
      "Your fellowship selection is confirmed — please complete the agreement process to proceed.",
    details: [
      "Your fellowship award is reserved pending completion of the official agreement.",
      "The agreement outlines fellowship terms, obligations, and disbursement conditions.",
      "Bank verification and undertaking submission may also be required.",
    ],
    nextSteps: [
      "Sign the fellowship agreement in your applicant portal at the earliest.",
      "Complete bank detail verification and any pending fellowship documents.",
      "Contact the fellowship office if you need assistance with the agreement process.",
    ],
    tone: "info",
  },
  COMPLETED: {
    headline: "Fellowship Completed Successfully",
    summary:
      "Congratulations on successfully completing your VGMF Research Fellowship programme.",
    details: [
      "You have fulfilled the fellowship requirements including reports and final submission.",
      "Your fellowship journey with the foundation is now formally complete.",
      "We thank you for your contribution to Ayurvedic research.",
    ],
    nextSteps: [
      "Download any completion certificates or documents from your portal.",
      "Ensure all fellowship closure formalities shown in the portal are complete.",
    ],
    tone: "success",
  },
  WITHDRAWN: {
    headline: "Application Withdrawn",
    summary: "Your fellowship application has been marked as withdrawn.",
    details: [
      "Your application is no longer active in the current fellowship selection cycle.",
      "If this was done in error, contact the fellowship office immediately.",
    ],
    nextSteps: [
      "Contact support through the portal if you wish to discuss reactivation.",
    ],
    tone: "neutral",
  },
  SUSPENDED: {
    headline: "Fellowship Suspended",
    summary: "Your fellowship has been temporarily suspended.",
    details: [
      "Fellowship activities and disbursements are paused pending review.",
      "Please refer to any communication from the fellowship office for specific reasons.",
    ],
    nextSteps: [
      "Contact the fellowship office through the portal support section.",
      "Review any admin messages in your dashboard for required actions.",
    ],
    tone: "warning",
  },
  TERMINATED: {
    headline: "Fellowship Terminated",
    summary: "Your fellowship has been terminated.",
    details: [
      "Your fellowship agreement and associated benefits are no longer active.",
      "Please refer to official communication for details regarding this decision.",
    ],
    nextSteps: [
      "Contact the fellowship office if you have questions about this decision.",
    ],
    tone: "warning",
  },
};

export function buildStatusEmailContent(
  status: string,
  applicationNumber: string
): StatusEmailContent {
  const label = getLifecycleStatusLabel(status);
  const preset = STATUS_EMAIL_CONTENT[status];

  if (preset) {
    return {
      subject: `Application Update — ${preset.headline} | ${applicationNumber}`,
      ...preset,
    };
  }

  return {
    subject: `Application Status Update — ${label} | ${applicationNumber}`,
    headline: label,
    summary: `Your fellowship application status has been updated to ${label}.`,
    details: [
      `Application number: ${applicationNumber}`,
      "Please log in to your applicant portal for full details.",
    ],
    nextSteps: ["Track your application anytime from the applicant dashboard."],
    tone: "neutral",
  };
}
