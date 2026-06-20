import prisma from "./db";
import { isDigioBankConfigured, isDigioIdentityConfigured } from "./digio";
import { maskSecret } from "./site-content";
import {
  mergeNotificationTemplates,
  resolveOtpWhatsAppTemplateLanguage,
  resolveOtpWhatsAppTemplateName,
} from "./notification-templates";

export interface EmailIntegrationConfig {
  token: string | null;
  fromEmail: string | null;
  fromName: string;
  otpSubject: string | null;
}

export interface WhatsAppIntegrationConfig {
  token: string | null;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  webhookVerifyToken: string | null;
  otpTemplateName: string;
  otpTemplateLanguage: string;
  apiVersion: string;
  defaultTemplateLanguage: string;
}

export interface IntegrationConfig {
  appUrl: string;
  email: EmailIntegrationConfig;
  whatsapp: WhatsAppIntegrationConfig;
  digio: DigioIntegrationConfig;
}

export interface DigioIntegrationConfig {
  clientId: string | null;
  clientSecret: string | null;
  webhookSecret: string | null;
  templateIdentity: string | null;
  templateBank: string | null;
  templateUndertaking: string | null;
  environment: "sandbox" | "production";
  requireIdentityForScrutiny: boolean;
  enabled: boolean;
}

async function getDbSettings() {
  try {
    return await prisma.integrationSettings.findUnique({ where: { id: "default" } });
  } catch {
    return null;
  }
}

export function normalizeAppUrl(url: string | null | undefined): string {
  const fallback = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const raw = (url?.trim() || fallback).trim();
  if (!raw) return "http://localhost:3000";

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const normalized = withProtocol.replace(/\/$/, "");

  try {
    const hostname = new URL(normalized).hostname.toLowerCase();
    if (
      (hostname === "0.0.0.0" || hostname === "127.0.0.1" || hostname === "localhost") &&
      url?.trim()
    ) {
      const fallbackNormalized = /^https?:\/\//i.test(fallback)
        ? fallback.replace(/\/$/, "")
        : `https://${fallback.replace(/\/$/, "")}`;
      if (fallbackNormalized && fallbackNormalized !== normalized) {
        return fallbackNormalized;
      }
    }
  } catch {
    // keep normalized string
  }

  return normalized;
}

function resolveDigioEnvironment(value: string | null | undefined): "sandbox" | "production" {
  return value?.trim().toLowerCase() === "sandbox" ? "sandbox" : "production";
}

export async function getIntegrationConfig(): Promise<IntegrationConfig> {
  const db = await getDbSettings();
  const notificationTemplates = mergeNotificationTemplates(db?.notificationTemplatesJson);
  const otpTemplate = notificationTemplates.find((item) => item.event === "OTP_VERIFICATION");

  const otpTemplateName = resolveOtpWhatsAppTemplateName([
    otpTemplate?.whatsappTemplateName,
    db?.whatsappOtpTemplateName,
    process.env.WHATSAPP_OTP_TEMPLATE_NAME,
  ]);

  const otpTemplateLanguage = resolveOtpWhatsAppTemplateLanguage([
    otpTemplate?.whatsappTemplateLanguage,
    db?.whatsappOtpTemplateLanguage,
    process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE,
  ]);

  return {
    appUrl: normalizeAppUrl(db?.appUrl || process.env.NEXT_PUBLIC_APP_URL),
    email: {
      token: db?.zeptomailToken || process.env.ZEPTOMAIL_TOKEN || null,
      fromEmail: db?.zeptomailFromEmail || process.env.ZEPTOMAIL_FROM_EMAIL || null,
      fromName:
        db?.zeptomailFromName ||
        process.env.ZEPTOMAIL_FROM_NAME ||
        "VGMF Fellowship Portal",
      otpSubject: db?.emailOtpSubject || null,
    },
    whatsapp: {
      token: db?.whatsappToken || process.env.WHATSAPP_TOKEN || null,
      phoneNumberId:
        db?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || null,
      businessAccountId:
        db?.whatsappBusinessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null,
      webhookVerifyToken:
        db?.whatsappWebhookVerifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || null,
      otpTemplateName,
      otpTemplateLanguage,
      apiVersion:
        db?.whatsappApiVersion || process.env.WHATSAPP_API_VERSION || "v22.0",
      defaultTemplateLanguage: otpTemplateLanguage,
    },
    digio: {
      clientId: db?.digioClientId || process.env.DIGIO_CLIENT_ID || null,
      clientSecret: db?.digioClientSecret || process.env.DIGIO_CLIENT_SECRET || null,
      webhookSecret: db?.digioWebhookSecret || process.env.DIGIO_WEBHOOK_SECRET || null,
      templateIdentity:
        db?.digioTemplateIdentity ||
        process.env.DIGIO_TEMPLATE_IDENTITY ||
        process.env.DIGIO_TEMPLATE_NAME ||
        null,
      templateBank: db?.digioTemplateBank || process.env.DIGIO_TEMPLATE_BANK || null,
      templateUndertaking:
        db?.digioTemplateUndertaking || process.env.DIGIO_TEMPLATE_UNDERTAKING || null,
      environment: resolveDigioEnvironment(
        db?.digioEnvironment || process.env.DIGIO_ENVIRONMENT
      ),
      requireIdentityForScrutiny:
        db?.digioRequireIdentityForScrutiny ??
        process.env.DIGIO_REQUIRE_IDENTITY_FOR_SCRUTINY === "true",
      enabled: db?.digioEnabled ?? process.env.DIGIO_ENABLED !== "false",
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

export async function isDigioIntegrationConfigured(): Promise<boolean> {
  return (await isDigioBankConfigured()) || (await isDigioIdentityConfigured());
}

export async function getIntegrationSettingsForAdmin() {
  const db = await getDbSettings();
  const config = await getIntegrationConfig();

  return {
    appUrl: normalizeAppUrl(db?.appUrl || process.env.NEXT_PUBLIC_APP_URL),
    zeptomailToken: maskSecret(db?.zeptomailToken || process.env.ZEPTOMAIL_TOKEN),
    zeptomailFromEmail: db?.zeptomailFromEmail || process.env.ZEPTOMAIL_FROM_EMAIL || "",
    zeptomailFromName: config.email.fromName,
    whatsappToken: maskSecret(db?.whatsappToken || process.env.WHATSAPP_TOKEN),
    whatsappPhoneNumberId:
      db?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    whatsappOtpTemplateName: config.whatsapp.otpTemplateName,
    whatsappOtpTemplateLanguage: config.whatsapp.otpTemplateLanguage,
    whatsappApiVersion: config.whatsapp.apiVersion,
    whatsappBusinessAccountId:
      db?.whatsappBusinessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
    whatsappWebhookVerifyToken:
      db?.whatsappWebhookVerifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
    emailOtpSubject:
      db?.emailOtpSubject || "Verify your email — VGMF Fellowship Portal",
    notificationTemplates: mergeNotificationTemplates(db?.notificationTemplatesJson),
    whatsappWebhookUrl: `${normalizeAppUrl(db?.appUrl || process.env.NEXT_PUBLIC_APP_URL)}/api/webhooks/whatsapp`,
    digioClientId: maskSecret(db?.digioClientId || process.env.DIGIO_CLIENT_ID),
    digioClientSecret: maskSecret(db?.digioClientSecret || process.env.DIGIO_CLIENT_SECRET),
    digioWebhookSecret: maskSecret(db?.digioWebhookSecret || process.env.DIGIO_WEBHOOK_SECRET),
    digioTemplateIdentity:
      db?.digioTemplateIdentity ||
      process.env.DIGIO_TEMPLATE_IDENTITY ||
      process.env.DIGIO_TEMPLATE_NAME ||
      "",
    digioTemplateBank: db?.digioTemplateBank || process.env.DIGIO_TEMPLATE_BANK || "",
    digioTemplateUndertaking:
      db?.digioTemplateUndertaking || process.env.DIGIO_TEMPLATE_UNDERTAKING || "",
    digioEnvironment: config.digio.environment,
    digioRequireIdentityForScrutiny: config.digio.requireIdentityForScrutiny,
    digioEnabled: config.digio.enabled,
    status: {
      emailConfigured: !!(config.email.token && config.email.fromEmail),
      whatsappConfigured: !!(config.whatsapp.token && config.whatsapp.phoneNumberId),
      digioConfigured: await isDigioIntegrationConfigured(),
      digioBankConfigured: await isDigioBankConfigured(),
      digioIdentityConfigured: await isDigioIdentityConfigured(),
      emailSource: db?.zeptomailToken ? "database" : process.env.ZEPTOMAIL_TOKEN ? "environment" : "none",
      whatsappSource: db?.whatsappToken ? "database" : process.env.WHATSAPP_TOKEN ? "environment" : "none",
      digioSource: db?.digioClientId ? "database" : process.env.DIGIO_CLIENT_ID ? "environment" : "none",
    },
  };
}
