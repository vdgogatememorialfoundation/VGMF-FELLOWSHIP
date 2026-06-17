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
