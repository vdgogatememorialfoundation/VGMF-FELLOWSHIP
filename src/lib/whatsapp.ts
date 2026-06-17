import { getIntegrationConfig } from "./integrations";

export { isWhatsAppConfigured } from "./integrations";

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
  const config = await getIntegrationConfig();
  if (!config.whatsapp.token || !config.whatsapp.phoneNumberId) {
    console.warn("WhatsApp not configured — skipping OTP send");
    return false;
  }

  const to = normalizePhone(phone);
  const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: config.whatsapp.otpTemplateName,
      language: { code: config.whatsapp.otpTemplateLanguage },
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
        Authorization: `Bearer ${config.whatsapp.token}`,
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
  const config = await getIntegrationConfig();
  if (!config.whatsapp.token || !config.whatsapp.phoneNumberId) return false;

  const to = normalizePhone(phone);
  const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.whatsapp.token}`,
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
