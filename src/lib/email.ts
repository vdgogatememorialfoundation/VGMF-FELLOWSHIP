const ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email";

interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

function getConfig() {
  const token = process.env.ZEPTOMAIL_TOKEN;
  const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL;
  const fromName = process.env.ZEPTOMAIL_FROM_NAME || "VGMF Fellowship Portal";

  if (!token || !fromEmail) {
    return null;
  }

  return { token, fromEmail, fromName };
}

export function isEmailConfigured(): boolean {
  return getConfig() !== null;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const config = getConfig();
  if (!config) {
    console.warn("ZeptoMail not configured — skipping email send");
    return false;
  }

  const authToken = config.token.startsWith("Zoho-enczapikey")
    ? config.token
    : `Zoho-enczapikey ${config.token}`;

  try {
    const response = await fetch(ZEPTOMAIL_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authToken,
      },
      body: JSON.stringify({
        from: { address: config.fromEmail, name: config.fromName },
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
      console.error("ZeptoMail error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("ZeptoMail send failed:", error);
    return false;
  }
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  userId: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return sendEmail({
    to,
    toName: name,
    subject: "Welcome to VGMF Fellowship Portal",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Welcome to VGMF Fellowship Portal</h2>
        <p>Dear ${name},</p>
        <p>Your registration was successful. Your User ID is:</p>
        <p style="font-size: 20px; font-weight: bold; color: #16a34a;">${userId}</p>
        <p>You can now log in and complete your fellowship application.</p>
        <p><a href="${appUrl}/applicant" style="background: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a></p>
        <p style="color: #666; font-size: 12px;">Viddhakarma Global Medical Foundation</p>
      </div>
    `,
  });
}

export async function sendApplicationConfirmationEmail(
  to: string,
  name: string,
  applicationNumber: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const formattedNumber =
    applicationNumber.length === 12
      ? `${applicationNumber.slice(0, 4)} ${applicationNumber.slice(4, 8)} ${applicationNumber.slice(8)}`
      : applicationNumber;

  return sendEmail({
    to,
    toName: name,
    subject: `Application Received — Tracking No. ${applicationNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #1b6b52;">VGMF Fellowship Application Received</h2>
        <p>Dear ${name},</p>
        <p>Thank you for submitting your fellowship application to the <strong>Vaidya Gogate Memorial Foundation</strong>.</p>
        <div style="margin: 24px 0; padding: 20px; border: 2px dashed #c9a227; border-radius: 12px; background: #f8faf9; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280;">Your 12-Digit Application Number</p>
          <p style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 0.12em; color: #1b6b52;">${applicationNumber}</p>
          <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280;">${formattedNumber}</p>
        </div>
        <p>Please save this number for tracking your application status. You can also view updates anytime in your applicant dashboard.</p>
        <p><a href="${appUrl}/applicant/status" style="display: inline-block; background: #1b6b52; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Track Application Status</a></p>
        <p style="color: #6b7280; font-size: 13px;">We will notify you by email when your application moves to the next stage.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Vaidya Gogate Memorial Foundation Fellowship Portal 2026</p>
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
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return sendEmail({
    to,
    toName: name,
    subject: `Your ${roleLabel} Portal Account — VGMF Fellowship`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1b6b52;">VGMF Portal Account Created</h2>
        <p>Dear ${name},</p>
        <p>Your <strong>${roleLabel}</strong> account has been created for the Vaidya Gogate Memorial Foundation Fellowship Portal.</p>
        <p>Your User ID: <strong style="color: #1b6b52;">${userId}</strong></p>
        <p>Sign in at: <a href="${appUrl}${loginPath}">${appUrl}${loginPath}</a></p>
        <p style="color: #666; font-size: 13px;">Use the email and password provided by the administrator to log in.</p>
        <p style="color: #9ca3af; font-size: 12px;">Vaidya Gogate Memorial Foundation Fellowship Portal 2026</p>
      </div>
    `,
  });
}

export async function sendNotificationEmail(
  to: string,
  name: string,
  title: string,
  message: string
): Promise<boolean> {
  return sendEmail({
    to,
    toName: name,
    subject: `VGMF Portal: ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">${title}</h2>
        <p>Dear ${name},</p>
        <p>${message}</p>
        <p style="color: #666; font-size: 12px;">Viddhakarma Global Medical Foundation</p>
      </div>
    `,
  });
}
