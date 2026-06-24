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

function renderEmailHtml(title: string, bodyContent: string): string {
  return `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; padding: 30px 15px; margin: 0; min-height: 100%;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #1b6b52 0%, #124d3a 100%); padding: 32px 24px; text-align: center;">
            <span style="color: rgba(255, 255, 255, 0.85); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 6px;">${ORGANIZATION_NAME}</span>
            <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.01em;">${title}</h1>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding: 32px 24px; color: #334155; font-size: 15px; line-height: 1.6;">
            ${bodyContent}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; color: #64748b; font-size: 12px; line-height: 1.5;">
            <p style="margin: 0 0 8px 0; font-weight: 500;">${ORGANIZATION_NAME}</p>
            <p style="margin: 0; color: #94a3b8; font-size: 11px;">${ORGANIZATION_FOOTER}</p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export async function sendOtpEmail(to: string, code: string): Promise<EmailSendResult> {
  const config = await getIntegrationConfig();
  const appName = config.email.fromName || "VGMF Fellowship Portal";
  const subject =
    config.email.otpSubject?.trim() || `${appName} — Your verification code`;

  const bodyContent = `
    <p>Hello,</p>
    <p>Thank you for initiating your verification. Please use the following one-time password (OTP) to verify your email address:</p>
    <div style="margin: 32px 0; text-align: center;">
      <span style="display: inline-block; font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1b6b52; background-color: #f0fdf4; border: 1.5px dashed #1b6b52; padding: 12px 30px; border-radius: 8px;">${code}</span>
    </div>
    <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">This security code is temporary and will expire in <strong>10 minutes</strong>. Please do not share this code with anyone.</p>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 16px; border-top: 1px solid #f1f5f9; padding-top: 16px;">If you did not request this verification, you can safely ignore this email.</p>
  `;

  return sendEmail({
    to,
    subject,
    html: renderEmailHtml("Email Verification", bodyContent),
    text: `Your ${appName} verification code is ${code}. It expires in 10 minutes.`,
  });
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  userId: string,
  password?: string
): Promise<EmailSendResult> {
  const config = await getIntegrationConfig();
  const appUrl = config.appUrl;

  const passwordSection = password
    ? `
    <div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b;">Your Auto-Generated Password</p>
      <p style="margin: 0; font-size: 20px; font-weight: bold; color: #1b6b52; font-family: monospace;">${password}</p>
    </div>
    <p style="font-size: 13px; color: #64748b;">Please change this password immediately after logging in.</p>
    `
    : "";

  const bodyContent = `
    <p>Dear <strong>${name}</strong>,</p>
    <p>Welcome! Your account has been successfully registered on the <strong>${ORGANIZATION_NAME}</strong> Fellowship Portal.</p>
    <p>Please keep a record of your User ID for future logins:</p>
    <div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b;">Your Registered User ID</p>
      <p style="margin: 0; font-size: 20px; font-weight: bold; color: #1b6b52; font-family: monospace;">${userId}</p>
    </div>
    ${passwordSection}
    <p>You can now proceed to your dashboard to complete and submit your fellowship application.</p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="${appUrl}/applicant" style="display: inline-block; background-color: #1b6b52; color: #ffffff; font-weight: 600; padding: 14px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(27, 107, 82, 0.15); transition: background-color 0.2s;">Go to Dashboard</a>
    </div>
    <p style="font-size: 13px; color: #64748b;">If you need assistance during the application process, please open a support ticket in your portal.</p>
  `;

  return sendEmail({
    to,
    toName: name,
    subject: `Welcome to ${ORGANIZATION_NAME} Fellowship Portal`,
    html: renderEmailHtml("Welcome to the Fellowship Portal", bodyContent),
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

  const bodyContent = `
    <p>Dear <strong>${name}</strong>,</p>
    <p>Thank you for submitting your fellowship application to the <strong>${ORGANIZATION_NAME}</strong>.</p>
    <div style="margin: 24px 0; padding: 20px; border: 2px dashed #c9a227; border-radius: 12px; background: #f8faf9; text-align: center;">
      <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280;">Your 12-Digit Application Number</p>
      <p style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 0.12em; color: #1b6b52;">${applicationNumber}</p>
      <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280;">${formattedNumber}</p>
    </div>
    <p>Please save this number for tracking your application status. You can also view updates anytime in your applicant dashboard.</p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="${appUrl}/applicant/status" style="display: inline-block; background-color: #1b6b52; color: #ffffff; font-weight: 600; padding: 14px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(27, 107, 82, 0.15);">Track Application Status</a>
    </div>
    <p style="color: #6b7280; font-size: 13px;">We will notify you by email when your application moves to the next stage.</p>
  `;

  return sendEmail({
    to,
    toName: name,
    subject: `Application Received — ${ORGANIZATION_NAME} | ${applicationNumber}`,
    html: renderEmailHtml("Application Received", bodyContent),
    text: `Dear ${name},\n\nYour VGMF fellowship application has been received.\n\nApplication Number: ${applicationNumber}\n\nUse this 12-digit number to track your application at ${appUrl}/applicant/status`,
  });
}

export async function sendAccountCreatedEmail(
  to: string,
  name: string,
  userId: string,
  roleLabel: string,
  loginPath: string,
  password?: string
): Promise<EmailSendResult> {
  const config = await getIntegrationConfig();
  const appUrl = config.appUrl;

  const passwordSection = password
    ? `<p style="margin: 0; margin-top: 10px;"><span style="color: #64748b; display: inline-block; width: 100px;">Password:</span> <strong style="color: #1b6b52; font-family: monospace; font-size: 16px;">${password}</strong></p>`
    : "";

  const bodyContent = `
    <p>Dear <strong>${name}</strong>,</p>
    <p>An administrator has created a <strong>${roleLabel}</strong> account for you on the <strong>${ORGANIZATION_NAME}</strong> Fellowship Portal.</p>
    <div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; text-align: left;">
      <p style="margin: 0 0 10px 0;"><span style="color: #64748b; display: inline-block; width: 100px;">User ID:</span> <strong style="color: #1b6b52; font-family: monospace; font-size: 16px;">${userId}</strong></p>
      <p style="margin: 0;"><span style="color: #64748b; display: inline-block; width: 100px;">Account Role:</span> <strong>${roleLabel}</strong></p>
      ${passwordSection}
    </div>
    <p>To access your account, please sign in at the link below using the temporary password provided.</p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="${appUrl}${loginPath}" style="display: inline-block; background-color: #1b6b52; color: #ffffff; font-weight: 600; padding: 14px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(27, 107, 82, 0.15);">Access Portal Login</a>
    </div>
    <p style="font-size: 13px; color: #64748b; margin-top: 16px;">Please change your password immediately after logging in to secure your account.</p>
  `;

  return sendEmail({
    to,
    toName: name,
    subject: `Your ${roleLabel} Portal Account — VGMF Fellowship`,
    html: renderEmailHtml("Portal Account Created", bodyContent),
  });
}

export async function sendNotificationEmail(
  to: string,
  name: string,
  title: string,
  message: string
): Promise<EmailSendResult> {
  const bodyContent = `
    <p>Dear <strong>${name}</strong>,</p>
    <p>${message}</p>
    <p style="margin-top: 24px; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 16px;">To view more details or reply, please log in to the portal and visit your dashboard.</p>
  `;

  return sendEmail({
    to,
    toName: name,
    subject: `${ORGANIZATION_NAME} Portal: ${title}`,
    html: renderEmailHtml(title, bodyContent),
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
