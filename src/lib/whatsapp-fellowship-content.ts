import { ORGANIZATION_NAME } from "./constants";

export const FELLOWSHIP_PROGRAM_LABEL = `${ORGANIZATION_NAME} Research Fellowship 2026`;
export const FELLOWSHIP_PORTAL_LABEL = "VGMF Fellowship Portal";

const WHATSAPP_MAX_LENGTH = 1024;

function truncate(value: string, max = WHATSAPP_MAX_LENGTH): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function footer(portalUrl: string): string {
  return `\n\nTrack your application: ${portalUrl.replace(/\/$/, "")}/applicant/status\n\n— ${FELLOWSHIP_PORTAL_LABEL}`;
}

export function buildWelcomeWhatsAppMessage(input: {
  name: string;
  userId: string;
  portalUrl: string;
}): string {
  return truncate(
    [
      `Dear ${input.name},`,
      "",
      `Welcome to the ${FELLOWSHIP_PROGRAM_LABEL}.`,
      "Your applicant account has been created successfully.",
      "",
      `User ID: ${input.userId}`,
      `Portal: ${input.portalUrl.replace(/\/$/, "")}/applicant`,
      "",
      "Sign in with WhatsApp OTP to complete and submit your fellowship application.",
      "",
      `— ${FELLOWSHIP_PORTAL_LABEL}`,
    ].join("\n")
  );
}

export function buildApplicationSubmittedWhatsAppMessage(input: {
  name: string;
  applicationNumber: string;
  userId?: string | null;
  email?: string | null;
  projectTitle?: string | null;
  portalUrl: string;
}): string {
  const lines = [
    `Dear ${input.name},`,
    "",
    `Your ${FELLOWSHIP_PROGRAM_LABEL} application has been submitted successfully.`,
    "",
    `Application Number: ${input.applicationNumber}`,
  ];

  if (input.userId) lines.push(`User ID: ${input.userId}`);
  if (input.email) lines.push(`Email: ${input.email}`);
  if (input.projectTitle?.trim()) lines.push(`Project Title: ${input.projectTitle.trim()}`);

  lines.push(footer(input.portalUrl));

  return truncate(lines.join("\n"));
}

export function buildFellowshipAlertWhatsAppMessage(input: {
  name: string;
  title: string;
  message: string;
  applicationNumber?: string | null;
  statusLabel?: string | null;
  portalUrl: string;
}): string {
  const lines = [`Dear ${input.name},`, "", input.title];

  if (input.applicationNumber) {
    lines.push(`Application Number: ${input.applicationNumber}`);
  }
  if (input.statusLabel) {
    lines.push(`Status: ${input.statusLabel}`);
  }

  lines.push("", input.message, footer(input.portalUrl));

  return truncate(lines.join("\n"));
}
