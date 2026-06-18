import prisma from "./db";
import { maskSecret } from "./site-content";

export interface EmailIntegrationConfig {
  token: string | null;
  fromEmail: string | null;
  fromName: string;
}

export interface WhatsAppIntegrationConfig {
  token: string | null;
  phoneNumberId: string | null;
  otpTemplateName: string;
  otpTemplateLanguage: string;
  apiVersion: string;
}

export interface IntegrationConfig {
  appUrl: string;
  email: EmailIntegrationConfig;
  whatsapp: WhatsAppIntegrationConfig;
  didit: DiditIntegrationConfig;
}

export interface DiditIntegrationConfig {
  apiKey: string | null;
  webhookSecret: string | null;
  workflowIdIdentity: string | null;
  workflowIdBank: string | null;
  workflowIdUndertaking: string | null;
  requireIdentityForScrutiny: boolean;
}

async function getDbSettings() {
  try {
    return await prisma.integrationSettings.findUnique({ where: { id: "default" } });
  } catch {
    return null;
  }
}

export async function getIntegrationConfig(): Promise<IntegrationConfig> {
  const db = await getDbSettings();

  return {
    appUrl:
      db?.appUrl ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000",
    email: {
      token: db?.zeptomailToken || process.env.ZEPTOMAIL_TOKEN || null,
      fromEmail: db?.zeptomailFromEmail || process.env.ZEPTOMAIL_FROM_EMAIL || null,
      fromName:
        db?.zeptomailFromName ||
        process.env.ZEPTOMAIL_FROM_NAME ||
        "VGMF Fellowship Portal",
    },
    whatsapp: {
      token: db?.whatsappToken || process.env.WHATSAPP_TOKEN || null,
      phoneNumberId:
        db?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || null,
      otpTemplateName:
        db?.whatsappOtpTemplateName ||
        process.env.WHATSAPP_OTP_TEMPLATE_NAME ||
        "authentication",
      otpTemplateLanguage:
        db?.whatsappOtpTemplateLanguage ||
        process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE ||
        "en",
      apiVersion:
        db?.whatsappApiVersion || process.env.WHATSAPP_API_VERSION || "v22.0",
    },
    didit: {
      apiKey: db?.diditApiKey || process.env.DIDIT_API_KEY || null,
      webhookSecret: db?.diditWebhookSecret || process.env.DIDIT_WEBHOOK_SECRET || null,
      workflowIdIdentity:
        db?.diditWorkflowIdIdentity ||
        process.env.DIDIT_WORKFLOW_ID ||
        process.env.DIDIT_WORKFLOW_ID_IDENTITY ||
        null,
      workflowIdBank: db?.diditWorkflowIdBank || process.env.DIDIT_WORKFLOW_ID_BANK || null,
      workflowIdUndertaking:
        db?.diditWorkflowIdUndertaking || process.env.DIDIT_WORKFLOW_ID_UNDERTAKING || null,
      requireIdentityForScrutiny:
        db?.diditRequireIdentityForScrutiny ??
        process.env.DIDIT_REQUIRE_IDENTITY_FOR_SCRUTINY === "true",
    },
  };
}

export async function isEmailConfigured(): Promise<boolean> {
  const config = await getIntegrationConfig();
  return !!(config.email.token && config.email.fromEmail);
}

export async function isWhatsAppConfigured(): Promise<boolean> {
  const config = await getIntegrationConfig();
  return !!(config.whatsapp.token && config.whatsapp.phoneNumberId);
}

export async function isDiditIntegrationConfigured(): Promise<boolean> {
  const config = await getIntegrationConfig();
  return !!(
    config.didit.apiKey &&
    config.didit.webhookSecret &&
    (config.didit.workflowIdIdentity ||
      config.didit.workflowIdBank ||
      config.didit.workflowIdUndertaking)
  );
}

export async function getIntegrationSettingsForAdmin() {
  const db = await getDbSettings();
  const config = await getIntegrationConfig();

  return {
    appUrl: db?.appUrl || process.env.NEXT_PUBLIC_APP_URL || "",
    zeptomailToken: maskSecret(db?.zeptomailToken || process.env.ZEPTOMAIL_TOKEN),
    zeptomailFromEmail: db?.zeptomailFromEmail || process.env.ZEPTOMAIL_FROM_EMAIL || "",
    zeptomailFromName: config.email.fromName,
    whatsappToken: maskSecret(db?.whatsappToken || process.env.WHATSAPP_TOKEN),
    whatsappPhoneNumberId:
      db?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    whatsappOtpTemplateName: config.whatsapp.otpTemplateName,
    whatsappOtpTemplateLanguage: config.whatsapp.otpTemplateLanguage,
    whatsappApiVersion: config.whatsapp.apiVersion,
    diditApiKey: maskSecret(db?.diditApiKey || process.env.DIDIT_API_KEY),
    diditWebhookSecret: maskSecret(db?.diditWebhookSecret || process.env.DIDIT_WEBHOOK_SECRET),
    diditWorkflowIdIdentity:
      db?.diditWorkflowIdIdentity ||
      process.env.DIDIT_WORKFLOW_ID ||
      process.env.DIDIT_WORKFLOW_ID_IDENTITY ||
      "",
    diditWorkflowIdBank: db?.diditWorkflowIdBank || process.env.DIDIT_WORKFLOW_ID_BANK || "",
    diditWorkflowIdUndertaking:
      db?.diditWorkflowIdUndertaking || process.env.DIDIT_WORKFLOW_ID_UNDERTAKING || "",
    diditRequireIdentityForScrutiny: config.didit.requireIdentityForScrutiny,
    status: {
      emailConfigured: !!(config.email.token && config.email.fromEmail),
      whatsappConfigured: !!(config.whatsapp.token && config.whatsapp.phoneNumberId),
      diditConfigured: await isDiditIntegrationConfigured(),
      emailSource: db?.zeptomailToken ? "database" : process.env.ZEPTOMAIL_TOKEN ? "environment" : "none",
      whatsappSource: db?.whatsappToken ? "database" : process.env.WHATSAPP_TOKEN ? "environment" : "none",
      diditSource: db?.diditApiKey ? "database" : process.env.DIDIT_API_KEY ? "environment" : "none",
    },
  };
}
