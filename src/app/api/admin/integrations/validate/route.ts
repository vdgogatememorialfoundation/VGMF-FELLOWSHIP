import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getIntegrationSettingsForAdmin,
  isEmailConfigured,
  isWhatsAppConfigured,
} from "@/lib/integrations";
import {
  mergeNotificationTemplates,
  validateNotificationSetup,
  type NotificationEventKey,
} from "@/lib/notification-templates";
import {
  checkWhatsAppCredentials,
  checkWhatsAppTemplate,
  checkWhatsAppWebhookConfig,
} from "@/lib/whatsapp-meta";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action as
    | "validate-all"
    | "check-credentials"
    | "check-webhook"
    | "check-template";

  const adminSettings = await getIntegrationSettingsForAdmin();
  const templates = mergeNotificationTemplates(adminSettings.notificationTemplates);

  if (action === "check-credentials") {
    const result = await checkWhatsAppCredentials();
    return NextResponse.json(result);
  }

  if (action === "check-webhook") {
    const result = await checkWhatsAppWebhookConfig(
      adminSettings.whatsappWebhookVerifyToken,
      adminSettings.appUrl
    );
    return NextResponse.json(result);
  }

  if (action === "check-template") {
    const event = body.event as NotificationEventKey | undefined;
    const templateName = body.templateName as string | undefined;
    const language = (body.language as string | undefined) || "en";
    const row = event ? templates.find((item) => item.event === event) : null;
    const result = await checkWhatsAppTemplate(
      templateName || row?.whatsappTemplateName || "",
      language || row?.whatsappTemplateLanguage || "en",
      adminSettings.whatsappBusinessAccountId
    );
    return NextResponse.json(result);
  }

  if (action === "validate-all") {
    const issues = validateNotificationSetup({
      emailConfigured: await isEmailConfigured(),
      whatsappConfigured: await isWhatsAppConfigured(),
      templates,
      whatsappWebhookVerifyToken: adminSettings.whatsappWebhookVerifyToken,
      emailOtpSubject: adminSettings.emailOtpSubject,
    });

    const whatsappEvents = templates.filter(
      (item) => item.channel === "WHATSAPP" || item.channel === "BOTH"
    );

    for (const item of whatsappEvents) {
      if (!item.whatsappTemplateName.trim()) continue;
      const meta = await checkWhatsAppTemplate(
        item.whatsappTemplateName,
        item.whatsappTemplateLanguage,
        adminSettings.whatsappBusinessAccountId
      );
      if (!meta.ok) {
        issues.push({
          level: "error",
          event: item.event,
          message: meta.message,
        });
      }
    }

    const credentialCheck = await checkWhatsAppCredentials();
    if (!credentialCheck.ok) {
      issues.unshift({ level: "error", message: credentialCheck.message });
    }

    const webhookCheck = await checkWhatsAppWebhookConfig(
      adminSettings.whatsappWebhookVerifyToken,
      adminSettings.appUrl
    );
    if (!webhookCheck.ok) {
      issues.push({ level: "warning", message: webhookCheck.message });
    }

    return NextResponse.json({
      ok: issues.every((issue) => issue.level !== "error"),
      issues,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
