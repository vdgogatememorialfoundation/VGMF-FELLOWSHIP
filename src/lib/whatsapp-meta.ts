import { getIntegrationConfig, normalizeAppUrl } from "./integrations";

export type MetaCheckResult = {
  ok: boolean;
  message: string;
  details?: string;
};

export function getWhatsAppWebhookUrl(appUrl?: string | null): string {
  const base = normalizeAppUrl(appUrl);
  return `${base}/api/webhooks/whatsapp`;
}

export async function checkWhatsAppCredentials(): Promise<MetaCheckResult> {
  const config = await getIntegrationConfig();
  if (!config.whatsapp.token || !config.whatsapp.phoneNumberId) {
    return {
      ok: false,
      message: "WhatsApp token or Phone Number ID is missing.",
    };
  }

  const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.whatsapp.token}` },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
      display_phone_number?: string;
      verified_name?: string;
    } | null;

    if (!response.ok) {
      return {
        ok: false,
        message: payload?.error?.message || "Meta API rejected the WhatsApp credentials.",
        details: JSON.stringify(payload),
      };
    }

    return {
      ok: true,
      message: `Connected to ${payload?.verified_name || "WhatsApp Business"} (${payload?.display_phone_number || config.whatsapp.phoneNumberId}).`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to reach Meta Graph API.",
    };
  }
}

function languagesMatch(requested: string, templateLanguage: string): boolean {
  const req = requested.trim().toLowerCase().replace(/_/g, "-");
  const tpl = templateLanguage.trim().toLowerCase().replace(/_/g, "-");
  if (!req || !tpl) return true;
  if (req === tpl) return true;
  const reqBase = req.split("-")[0];
  const tplBase = tpl.split("-")[0];
  return reqBase === tplBase;
}

function isUsableMetaTemplateStatus(status?: string | null): boolean {
  if (!status) return true;
  const normalized = status.toUpperCase();
  if (normalized === "REJECTED" || normalized === "PAUSED" || normalized === "DISABLED") {
    return false;
  }
  return (
    normalized === "APPROVED" ||
    normalized === "PENDING" ||
    normalized === "ACTIVE" ||
    normalized === "IN_APPEAL"
  );
}

export type MetaTemplateRow = {
  name?: string;
  status?: string;
  language?: string;
  category?: string;
  components?: Array<{ type?: string; text?: string }>;
};

export async function lookupWhatsAppTemplateRows(templateName: string): Promise<{
  wabaId: string | null;
  templates: MetaTemplateRow[];
  approvedLanguages: string[];
  isAuthentication: boolean;
  error?: string;
  hint?: string;
}> {
  const config = await getIntegrationConfig();
  const tplName = templateName.trim();
  const wabaId =
    config.whatsapp.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null;

  if (!config.whatsapp.token) {
    return {
      wabaId,
      templates: [],
      approvedLanguages: [],
      isAuthentication: false,
      error: "WhatsApp access token is not configured.",
    };
  }

  if (!wabaId) {
    return {
      wabaId: null,
      templates: [],
      approvedLanguages: [],
      isAuthentication: false,
      error: "WhatsApp Business Account ID (WABA) is not configured.",
      hint: "Set WABA ID in Admin → API Settings.",
    };
  }

  if (!tplName) {
    return {
      wabaId,
      templates: [],
      approvedLanguages: [],
      isAuthentication: false,
      error: "Template name is required.",
    };
  }

  const params = new URLSearchParams({
    fields: "name,status,language,category,components",
    limit: "20",
    name: tplName,
  });

  const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${wabaId}/message_templates?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.whatsapp.token}` },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
      data?: MetaTemplateRow[];
    } | null;

    if (!response.ok) {
      return {
        wabaId,
        templates: [],
        approvedLanguages: [],
        isAuthentication: false,
        error: payload?.error?.message || "Meta API could not list templates.",
      };
    }

    const templates = (payload?.data || []).filter((row) => row.name === tplName);
    const approvedLanguages = [
      ...new Set(
        templates
          .filter((row) => isUsableMetaTemplateStatus(row.status))
          .map((row) => row.language?.trim())
          .filter(Boolean) as string[]
      ),
    ];
    const isAuthentication = templates.some(
      (row) => String(row.category || "").toUpperCase() === "AUTHENTICATION"
    );

    if (!templates.length) {
      return {
        wabaId,
        templates: [],
        approvedLanguages: [],
        isAuthentication: false,
        error: `Template "${tplName}" was not found on WABA ${wabaId}.`,
        hint: "Create or approve vgmf_otp_auth in Meta WhatsApp Manager.",
      };
    }

    return { wabaId, templates, approvedLanguages, isAuthentication };
  } catch (error) {
    return {
      wabaId,
      templates: [],
      approvedLanguages: [],
      isAuthentication: false,
      error: error instanceof Error ? error.message : "Failed to look up template on Meta.",
    };
  }
}

export function isTemplateTranslationError(message?: string): boolean {
  const text = (message || "").toLowerCase();
  return text.includes("132001") || text.includes("does not exist in the translation");
}

export function isTemplateParameterError(message?: string): boolean {
  const text = (message || "").toLowerCase();
  return text.includes("132000") || text.includes("parameter");
}

export async function checkWhatsAppTemplate(
  templateName: string,
  language = "en",
  businessAccountId?: string | null
): Promise<MetaCheckResult> {
  const config = await getIntegrationConfig();
  if (!config.whatsapp.token) {
    return { ok: false, message: "WhatsApp access token is not configured." };
  }

  if (!templateName.trim()) {
    return { ok: false, message: "Template name is required." };
  }

  const wabaId = businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null;
  if (!wabaId) {
    return {
      ok: false,
      message: "WhatsApp Business Account ID (WABA) is required to check templates on Meta.",
    };
  }

  const params = new URLSearchParams({
    fields: "name,status,language,category",
    limit: "20",
    name: templateName.trim(),
  });

  const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${wabaId}/message_templates?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.whatsapp.token}` },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
      data?: Array<{ name?: string; status?: string; language?: string }>;
    } | null;

    if (!response.ok) {
      return {
        ok: false,
        message: payload?.error?.message || "Meta API could not list templates.",
        details: JSON.stringify(payload),
      };
    }

    const match =
      payload?.data?.find(
        (item) =>
          item.name === templateName.trim() &&
          languagesMatch(language, item.language || "")
      ) ??
      payload?.data?.find((item) => item.name === templateName.trim()) ??
      payload?.data?.[0];

    if (!match) {
      return {
        ok: false,
        message: `Template "${templateName}" (${language}) was not found in Meta Business.`,
      };
    }

    if (!isUsableMetaTemplateStatus(match.status)) {
      return {
        ok: false,
        message: `Template "${templateName}" exists but status is ${match.status}.`,
      };
    }

    return {
      ok: true,
      message: `Template "${match.name}" (${match.language || language}) is available on Meta (${match.status || "APPROVED"}).`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to check template on Meta.",
    };
  }
}

export async function checkWhatsAppWebhookConfig(
  verifyToken?: string | null,
  appUrl?: string | null
): Promise<MetaCheckResult> {
  if (!verifyToken?.trim()) {
    return {
      ok: false,
      message: "Webhook verify token is not configured in API Settings.",
    };
  }

  return {
    ok: true,
    message: `Webhook verify token is set. Register this callback URL in Meta: ${getWhatsAppWebhookUrl(appUrl)}`,
  };
}
