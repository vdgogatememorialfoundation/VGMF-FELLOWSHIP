const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

interface WhatsAppConfig {
  token: string;
  phoneNumberId: string;
  otpTemplateName: string;
  otpTemplateLanguage: string;
}

function getConfig(): WhatsAppConfig | null {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return null;
  }

  return {
    token,
    phoneNumberId,
    otpTemplateName: process.env.WHATSAPP_OTP_TEMPLATE_NAME || "authentication",
    otpTemplateLanguage: process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE || "en",
  };
}

export function isWhatsAppConfigured(): boolean {
  return getConfig() !== null;
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  return digits;
}

export async function sendWhatsAppOtp(
  phone: string,
  otpCode: string
): Promise<boolean> {
  const config = getConfig();
  if (!config) {
    console.warn("WhatsApp not configured — skipping OTP send");
    return false;
  }

  const to = normalizePhone(phone);
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${config.phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: config.otpTemplateName,
      language: { code: config.otpTemplateLanguage },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: otpCode }],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: otpCode }],
        },
      ],
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("WhatsApp OTP error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("WhatsApp OTP send failed:", error);
    return false;
  }
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  const to = normalizePhone(phone);
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${config.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("WhatsApp message error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("WhatsApp message failed:", error);
    return false;
  }
}
