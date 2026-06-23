import prisma from "./db";
import { isSetConfigured, getSetConfig } from "./setu";
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
  setu: {
    enabled: boolean;
    clientId: string | null;
    clientSecret: string | null;
    productInstanceId: string | null;
    environment: "sandbox" | "production";
  };
  activeVerificationProvider: string;
}

async function getDbSettings() {
  try {
    return await prisma.integrationSettings.findUnique({ where: { id: "default" } });
  } catch {
    return null;
  }
}

export const FELLOWSHIP_APP_URL = "https://fellowship.vaidyagogate.org";

export function isBlockedIntegrationHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes("seminar.") ||
      host === "0.0.0.0" ||
      host === "127.0.0.1" ||
      host === "localhost"
    );
  } catch {
    return true;
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

export function resolveIntegrationAppUrl(
  dbUrl?: string | null,
  envUrl?: string | null
): string {
  const candidates = [
    dbUrl,
    envUrl ?? process.env.NEXT_PUBLIC_APP_URL,
    FELLOWSHIP_APP_URL,
  ];

  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const normalized = normalizeAppUrl(raw.trim()).replace(/\/$/, "");
    if (isBlockedIntegrationHost(normalized)) continue;
    return normalized;
  }

  return FELLOWSHIP_APP_URL;
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
    appUrl: resolveIntegrationAppUrl(db?.appUrl, process.env.NEXT_PUBLIC_APP_URL),
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
    setu: {
      enabled: db?.setuEnabled ?? false,
      clientId: db?.setuClientId || process.env.SETU_CLIENT_ID || null,
      clientSecret: db?.setuClientSecret || process.env.SETU_CLIENT_SECRET || null,
      productInstanceId: db?.setuProductInstanceId || process.env.SETU_PRODUCT_INSTANCE_ID || null,
      environment: db?.setuEnvironment === "sandbox" ? "sandbox" : "production",
    },
    activeVerificationProvider: db?.activeVerificationProvider || "SETU",
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

export async function isIdentityVerificationConfigured(): Promise<boolean> {
  const config = await getIntegrationConfig();
  if (config.activeVerificationProvider === "SETU") {
    return await isSetConfigured();
  }
  return false;
}

export async function getIntegrationSettingsForAdmin() {
  const db = await getDbSettings();
  const config = await getIntegrationConfig();

  const appUrl = resolveIntegrationAppUrl(db?.appUrl, process.env.NEXT_PUBLIC_APP_URL);
  const storedAppUrl = db?.appUrl?.trim() ? normalizeAppUrl(db.appUrl) : null;
  const appUrlCorrectedFromStored =
    storedAppUrl != null && isBlockedIntegrationHost(storedAppUrl);

  return {
    appUrl,
    appUrlCorrectedFromStored,
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
    whatsappWebhookUrl: `${appUrl}/api/webhooks/whatsapp`,
    // Setu
    setuEnabled: config.setu.enabled,
    setuClientId: maskSecret(db?.setuClientId || process.env.SETU_CLIENT_ID),
    setuClientSecret: maskSecret(db?.setuClientSecret || process.env.SETU_CLIENT_SECRET),
    setuProductInstanceId: maskSecret(db?.setuProductInstanceId || process.env.SETU_PRODUCT_INSTANCE_ID),
    setuEnvironment: config.setu.environment,
    
    activeVerificationProvider: config.activeVerificationProvider,
    
    status: {
      emailConfigured: !!(config.email.token && config.email.fromEmail),
      whatsappConfigured: !!(config.whatsapp.token && config.whatsapp.phoneNumberId),
      setuConfigured: !!(config.setu.enabled && config.setu.clientId && config.setu.clientSecret),
      emailSource: db?.zeptomailToken ? "database" : process.env.ZEPTOMAIL_TOKEN ? "environment" : "none",
      whatsappSource: db?.whatsappToken ? "database" : process.env.WHATSAPP_TOKEN ? "environment" : "none",
    },
  };
}
