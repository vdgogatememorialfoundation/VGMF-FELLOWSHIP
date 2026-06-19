import { getIntegrationConfig } from "./integrations";
import { ORGANIZATION_FOOTER, ORGANIZATION_NAME } from "./constants";
import type { StatusEmailContent } from "./status-email";

const DEFAULT_ZEPTOMAIL_API_URL = "https://api.zeptomail.in/v1.1/email";

interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

export type EmailSendResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "api_error" | "network_error";
      detail?: string;
    };

export { isEmailConfigured } from "./integrations";

function getZeptoMailApiUrl() {
  return process.env.ZEPTOMAIL_API_URL || DEFAULT_ZEPTOMAIL_API_URL;
}

function formatZeptoMailError(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; details?: Array<{ message?: string }> };
      message?: string;
    };
    return (
      parsed.error?.details?.[0]?.message ||
      parsed.error?.message ||
      parsed.message
    );
  } catch {
    return body.slice(0, 200) || undefined;
  }
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  const config = await getIntegrationConfig();
  if (!config.email.token || !config.email.fromEmail) {
    console.warn("ZeptoMail not configured — skipping email send");
    return { ok: false, reason: "not_configured" };
  }

  const authToken = config.email.token.startsWith("Zoho-enczapikey")
    ? config.email.token
    : `Zoho-enczapikey ${config.email.token}`;

  try {
    const response = await fetch(getZeptoMailApiUrl(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authToken,
      },
      body: JSON.stringify({
        from: { address: config.email.fromEmail, name: config.email.fromName },
        to: [
          {
            email_address: {
              address: options.to,
              name: options.toName || options.to,
            },
          },
        ],
        subject: options.subject,
        htmlbody: options.html,
        textbody: options.text || options.html.replace(/<[^>]*>/g, ""),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      const detail = formatZeptoMailError(error);
      console.error("ZeptoMail error:", error);
      return { ok: false, reason: "api_error", detail };
    }

    return { ok: true };
  } catch (error) {
    console.error("ZeptoMail send failed:", error);
    return {
      ok: false,
      reason: "network_error",
      detail: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function sendOtpEmail(to: string, code: string): Promise<EmailSendResult> {
  const config = await getIntegrationConfig();
  const appName = config.email.fromName || "VGMF Fellowship Portal";
  const subject =
    config.email.otpSubject?.trim() || `${appName} — Your verification code`;

  return sendEmail({
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Email Verification</h2>
        <p>Use the one-time password below to verify your email address:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #16a34a; margin: 24px 0;">${code}</p>
        <p style="color: #666;">This code expires in 10 minutes. Do not share it with anyone.</p>
        <p style="color: #666; font-size: 12px;">If you did not request this code, you can safely ignore this email.</p>
        <p style="color: #666; font-size: 12px;">${ORGANIZATION_NAME}</p>
      </div>
    `,
    text: `Your ${appName} verification code is ${code}. It expires in 10 minutes.`,
  });
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  userId: string
): Promise<EmailSendResult> {
  const config = await getIntegrationConfig();
  const appUrl = config.appUrl;

  return sendEmail({
    to,
    toName: name,
    subject: `Welcome to ${ORGANIZATION_NAME} Fellowship Portal`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Welcome to ${ORGANIZATION_NAME}</h2>
        <p>Dear ${name},</p>
        <p>Your registration was successful. Your User ID is:</p>
        <p style="font-size: 20px; font-weight: bold; color: #16a34a;">${userId}</p>
        <p>You can now log in and complete your fellowship application.</p>
        <p><a href="${appUrl}/applicant" style="background: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a></p>
        <p style="color: #666; font-size: 12px;">${ORGANIZATION_FOOTER}</p>
      </div>
    `,
  });
}

export async function sendApplicationConfirmationEmail(
  to: string,
  name: string,
  applicationNumber: string
): Promise<EmailSendResult> {
  const config = await getIntegrationConfig();
  const appUrl = config.appUrl;
  const formattedNumber =
    applicationNumber.length === 12
      ? `${applicationNumber.slice(0, 4)} ${applicationNumber.slice(4, 8)} ${applicationNumber.slice(8)}`
      : applicationNumber;

  return sendEmail({
    to,
    toName: name,
    subject: `Application Received — ${ORGANIZATION_NAME} | ${applicationNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #1b6b52;">${ORGANIZATION_NAME} — Application Received</h2>
        <p>Dear ${name},</p>
        <p>Thank you for submitting your fellowship application to the <strong>${ORGANIZATION_NAME}</strong>.</p>
        <div style="margin: 24px 0; padding: 20px; border: 2px dashed #c9a227; border-radius: 12px; background: #f8faf9; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280;">Your 12-Digit Application Number</p>
          <p style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 0.12em; color: #1b6b52;">${applicationNumber}</p>
          <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280;">${formattedNumber}</p>
        </div>
        <p>Please save this number for tracking your application status. You can also view updates anytime in your applicant dashboard.</p>
        <p><a href="${appUrl}/applicant/status" style="display: inline-block; background: #1b6b52; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Track Application Status</a></p>
        <p style="color: #6b7280; font-size: 13px;">We will notify you by email when your application moves to the next stage.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">${ORGANIZATION_FOOTER}</p>
      </div>
    `,
    text: `Dear ${name},\n\nYour VGMF fellowship application has been received.\n\nApplication Number: ${applicationNumber}\n\nUse this 12-digit number to track your application at ${appUrl}/applicant/status`,
  });
}

export async function sendAccountCreatedEmail(
  to: string,
  name: string,
  userId: string,
  roleLabel: string,
  loginPath: string
): Promise<EmailSendResult> {
  const config = await getIntegrationConfig();
  const appUrl = config.appUrl;

  return sendEmail({
    to,
    toName: name,
    subject: `Your ${roleLabel} Portal Account — VGMF Fellowship`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1b6b52;">VGMF Portal Account Created</h2>
        <p>Dear ${name},</p>
        <p>Your <strong>${roleLabel}</strong> account has been created for the ${ORGANIZATION_NAME} Fellowship Portal.</p>
        <p>Your User ID: <strong style="color: #1b6b52;">${userId}</strong></p>
        <p>Sign in at: <a href="${appUrl}${loginPath}">${appUrl}${loginPath}</a></p>
        <p style="color: #666; font-size: 13px;">Use the email and password provided by the administrator to log in.</p>
        <p style="color: #9ca3af; font-size: 12px;">${ORGANIZATION_FOOTER}</p>
      </div>
    `,
  });
}

export async function sendNotificationEmail(
  to: string,
  name: string,
  title: string,
  message: string
): Promise<EmailSendResult> {
  return sendEmail({
    to,
    toName: name,
    subject: `${ORGANIZATION_NAME} Portal: ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">${title}</h2>
        <p>Dear ${name},</p>
        <p>${message}</p>
        <p style="color: #666; font-size: 12px;">${ORGANIZATION_FOOTER}</p>
      </div>
    `,
  });
}

const STATUS_EMAIL_COLORS: Record<StatusEmailContent["tone"], string> = {
  success: "#1b6b52",
  info: "#2563eb",
  warning: "#b45309",
  neutral: "#374151",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderList(items: string[]): string {
  return items
    .map((item) => `<li style="margin-bottom: 8px;">${escapeHtml(item)}</li>`)
    .join("");
}

export async function sendApplicationStatusEmail(
  to: string,
  name: string,
  applicationNumber: string,
  content: StatusEmailContent
): Promise<EmailSendResult> {
  const config = await getIntegrationConfig();
  const appUrl = config.appUrl;
  const accent = STATUS_EMAIL_COLORS[content.tone];
  const formattedNumber =
    applicationNumber.length === 12
      ? `${applicationNumber.slice(0, 4)} ${applicationNumber.slice(4, 8)} ${applicationNumber.slice(8)}`
      : applicationNumber;

  const textBody = [
    `Dear ${name},`,
    "",
    content.headline,
    content.summary,
    "",
    "Details:",
    ...content.details.map((item) => `- ${item}`),
    "",
    "Next steps:",
    ...content.nextSteps.map((item) => `- ${item}`),
    "",
    `Application Number: ${applicationNumber}`,
    `Track status: ${appUrl}/applicant/status`,
    "",
    ORGANIZATION_FOOTER,
  ].join("\n");

  return sendEmail({
    to,
    toName: name,
    subject: content.subject,
    text: textBody,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937;">
        <div style="border-bottom: 4px solid ${accent}; padding-bottom: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 6px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280;">${ORGANIZATION_NAME}</p>
          <h1 style="margin: 0; font-size: 26px; color: ${accent};">${escapeHtml(content.headline)}</h1>
        </div>

        <p style="font-size: 16px;">Dear ${escapeHtml(name)},</p>
        <p style="font-size: 15px; line-height: 1.6;">${escapeHtml(content.summary)}</p>

        <div style="margin: 24px 0; padding: 20px; border: 2px dashed #c9a227; border-radius: 12px; background: #f8faf9; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280;">Application Number</p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.1em; color: #1b6b52;">${escapeHtml(applicationNumber)}</p>
          <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">${escapeHtml(formattedNumber)}</p>
        </div>

        <div style="margin: 24px 0; padding: 20px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <h2 style="margin: 0 0 12px; font-size: 16px; color: #111827;">What this update means</h2>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">${renderList(content.details)}</ul>
        </div>

        <div style="margin: 24px 0; padding: 20px; background: #eff6ff; border-radius: 12px; border: 1px solid #bfdbfe;">
          <h2 style="margin: 0 0 12px; font-size: 16px; color: #1e3a8a;">Recommended next steps</h2>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">${renderList(content.nextSteps)}</ul>
        </div>

        <p style="text-align: center; margin: 32px 0 24px;">
          <a href="${appUrl}/applicant/status" style="display: inline-block; background: ${accent}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Application Status</a>
        </p>

        <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
          This email was sent because your fellowship application reached an important milestone.
          Intermediate review steps may not generate separate emails — please check your applicant dashboard for full tracking details.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">${ORGANIZATION_FOOTER}</p>
      </div>
    `,
  });
}
