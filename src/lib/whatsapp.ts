import { getIntegrationConfig } from "./integrations";
import prisma from "./db";
import {
  getNotificationTemplate,
  mergeNotificationTemplates,
  type NotificationEventKey,
} from "./notification-templates";

export { isWhatsAppConfigured } from "./integrations";

export type WhatsAppSendResult = {
  ok: boolean;
  error?: string;
  messageId?: string;
};

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

function normalizeWhatsAppLanguage(code: string): string {
  const trimmed = code.trim();
  return trimmed || "en";
}

async function parseWhatsAppResponse(response: Response): Promise<WhatsAppSendResult> {
  const raw = await response.text();
  let payload: {
    error?: { message?: string; error_user_msg?: string; code?: number };
    messages?: Array<{ id?: string }>;
  } | null = null;

  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.error_user_msg ||
      payload?.error?.message ||
      raw ||
      `Meta API returned HTTP ${response.status}`;
    return { ok: false, error: message };
  }

  return {
    ok: true,
    messageId: payload?.messages?.[0]?.id,
  };
}

async function postWhatsAppPayload(payload: Record<string, unknown>): Promise<WhatsAppSendResult> {
  const config = await getIntegrationConfig();
  if (!config.whatsapp.token || !config.whatsapp.phoneNumberId) {
    return { ok: false, error: "WhatsApp is not configured (token or Phone Number ID missing)." };
  }

  const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.whatsapp.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await parseWhatsAppResponse(response);
    if (!result.ok) {
      console.error("WhatsApp API error:", result.error, JSON.stringify(payload).slice(0, 500));
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "WhatsApp request failed";
    console.error("WhatsApp send failed:", message);
    return { ok: false, error: message };
  }
}

function buildTemplatePayload(
  phone: string,
  templateName: string,
  language: string,
  components: Array<Record<string, unknown>>
) {
  return {
    messaging_product: "whatsapp",
    to: normalizePhone(phone),
    type: "template",
    template: {
      name: templateName,
      language: { code: normalizeWhatsAppLanguage(language) },
      ...(components.length > 0 ? { components } : {}),
    },
  };
}

export async function sendWhatsAppTemplateMessage(input: {
  phone: string;
  templateName: string;
  language?: string;
  bodyParameters?: string[];
  otpCode?: string;
}): Promise<WhatsAppSendResult> {
  const config = await getIntegrationConfig();
  const language = normalizeWhatsAppLanguage(input.language || config.whatsapp.otpTemplateLanguage);
  const bodyParameters = input.bodyParameters ?? [];

  const attempts: Array<Record<string, unknown>> = [];

  if (bodyParameters.length > 0) {
    attempts.push(
      buildTemplatePayload(input.phone, input.templateName, language, [
        {
          type: "body",
          parameters: bodyParameters.map((text) => ({ type: "text", text })),
        },
      ])
    );
  }

  if (input.otpCode) {
    attempts.push(
      buildTemplatePayload(input.phone, input.templateName, language, [
        {
          type: "body",
          parameters: [{ type: "text", text: input.otpCode }],
        },
        {
          type: "button",
          sub_type: "copy_code",
          index: "0",
          parameters: [{ type: "coupon_code", coupon_code: input.otpCode }],
        },
      ])
    );

    attempts.push(
      buildTemplatePayload(input.phone, input.templateName, language, [
        {
          type: "body",
          parameters: [{ type: "text", text: input.otpCode }],
        },
      ])
    );

    attempts.push(
      buildTemplatePayload(input.phone, input.templateName, language, [
        {
          type: "body",
          parameters: [{ type: "text", text: input.otpCode }],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: input.otpCode }],
        },
      ])
    );
  }

  if (attempts.length === 0) {
    attempts.push(buildTemplatePayload(input.phone, input.templateName, language, []));
  }

  let lastError = "Failed to send WhatsApp template message.";
  for (const payload of attempts) {
    const result = await postWhatsAppPayload(payload);
    if (result.ok) return result;
    lastError = result.error || lastError;
  }

  return { ok: false, error: lastError };
}

export async function sendWhatsAppOtp(phone: string, otpCode: string): Promise<WhatsAppSendResult> {
  const config = await getIntegrationConfig();
  return sendWhatsAppTemplateMessage({
    phone,
    templateName: config.whatsapp.otpTemplateName,
    language: config.whatsapp.otpTemplateLanguage,
    otpCode,
  });
}

export async function sendWhatsAppForEvent(
  event: NotificationEventKey,
  phone: string,
  bodyParameters: string[]
): Promise<WhatsAppSendResult> {
  const settings = await prisma.integrationSettings
    .findUnique({ where: { id: "default" }, select: { notificationTemplatesJson: true } })
    .catch(() => null);

  const templates = mergeNotificationTemplates(settings?.notificationTemplatesJson);
  const template = getNotificationTemplate(templates, event);

  if (template.channel === "EMAIL" || template.channel === "NONE") {
    return { ok: false, error: `WhatsApp is disabled for ${event}.` };
  }

  if (!template.whatsappTemplateName.trim()) {
    return postWhatsAppPayload({
      messaging_product: "whatsapp",
      to: normalizePhone(phone),
      type: "text",
      text: { body: bodyParameters.join("\n\n").slice(0, 4096) },
    });
  }

  return sendWhatsAppTemplateMessage({
    phone,
    templateName: template.whatsappTemplateName,
    language: template.whatsappTemplateLanguage,
    bodyParameters,
  });
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<boolean> {
  const result = await sendWhatsAppForEvent("PORTAL_ALERT", phone, [message.slice(0, 1024)]);
  if (result.ok) return true;

  const config = await getIntegrationConfig();
  const textResult = await postWhatsAppPayload({
    messaging_product: "whatsapp",
    to: normalizePhone(phone),
    type: "text",
    text: { body: message.slice(0, 4096) },
  });

  if (!textResult.ok) {
    console.error(
      "WhatsApp text fallback failed:",
      textResult.error,
      "Template attempt:",
      result.error
    );
  }

  return textResult.ok;
}

export async function sendWhatsAppMessageDetailed(
  phone: string,
  message: string
): Promise<WhatsAppSendResult> {
  const templateResult = await sendWhatsAppForEvent("PORTAL_ALERT", phone, [message.slice(0, 1024)]);
  if (templateResult.ok) return templateResult;

  const textResult = await postWhatsAppPayload({
    messaging_product: "whatsapp",
    to: normalizePhone(phone),
    type: "text",
    text: { body: message.slice(0, 4096) },
  });

  if (textResult.ok) return textResult;

  return {
    ok: false,
    error:
      textResult.error ||
      templateResult.error ||
      "WhatsApp message could not be delivered. Use an approved Meta template or message the business number first.",
  };
}
