import { createHmac, timingSafeEqual } from "crypto";
import type { Prisma, VerificationPurpose } from "@prisma/client";
import prisma from "./db";
import { getIntegrationConfig } from "./integrations";

const DEFAULT_BASE_URLS = {
  sandbox: "https://ext.digio.in",
  production: "https://api.digio.in",
} as const;

export class DigioApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DigioApiError";
    this.status = status;
  }
}

export type DigioKycRequestResponse = {
  id: string;
  access_token?: string;
  customer_identifier?: string;
  status?: string;
  reference_id?: string;
};

export type DigioWebhookPayload = {
  event?: string;
  id?: string;
  payload?: Record<string, unknown>;
};

export interface DigioConfig {
  clientId: string | null;
  clientSecret: string | null;
  webhookSecret: string | null;
  templateIdentity: string | null;
  templateBank: string | null;
  templateUndertaking: string | null;
  environment: "sandbox" | "production";
  requireIdentityForScrutiny: boolean;
  enabled: boolean;
  appUrl: string;
}

function getBaseUrl(environment: "sandbox" | "production"): string {
  return DEFAULT_BASE_URLS[environment];
}

function buildAuthHeader(clientId: string, clientSecret: string): string {
  const token = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${token}`;
}

function extractDigioError(payload: unknown, status: number): string {
  if (!payload || typeof payload !== "object") {
    return `Digio request failed (${status})`;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }
  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail;
  }
  if (Array.isArray(record.details)) {
    const parts = record.details
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .filter(Boolean);
    if (parts.length > 0) return parts.join("; ");
  }

  if (status === 401) {
    return "Digio authentication failed. Check Client ID and Client Secret in Admin → API Settings.";
  }
  if (status === 400) {
    return "Digio rejected the request. Check template names, customer identifier, and Digio account configuration.";
  }

  return `Digio request failed (${status})`;
}

export async function getDigioConfig(): Promise<DigioConfig> {
  const integration = await getIntegrationConfig();
  const db = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
  const envRaw = (
    db?.digioEnvironment ||
    process.env.DIGIO_ENVIRONMENT ||
    "production"
  ).toLowerCase();

  return {
    clientId: (db?.digioClientId || process.env.DIGIO_CLIENT_ID || null)?.trim() || null,
    clientSecret:
      (db?.digioClientSecret || process.env.DIGIO_CLIENT_SECRET || null)?.trim() || null,
    webhookSecret:
      (db?.digioWebhookSecret || process.env.DIGIO_WEBHOOK_SECRET || null)?.trim() || null,
    templateIdentity:
      (
        db?.digioTemplateIdentity ||
        process.env.DIGIO_TEMPLATE_IDENTITY ||
        process.env.DIGIO_TEMPLATE_NAME ||
        null
      )?.trim() || null,
    templateBank:
      (db?.digioTemplateBank || process.env.DIGIO_TEMPLATE_BANK || null)?.trim() || null,
    templateUndertaking:
      (
        db?.digioTemplateUndertaking ||
        process.env.DIGIO_TEMPLATE_UNDERTAKING ||
        null
      )?.trim() || null,
    environment: envRaw === "sandbox" ? "sandbox" : "production",
    requireIdentityForScrutiny:
      db?.digioRequireIdentityForScrutiny ??
      process.env.DIGIO_REQUIRE_IDENTITY_FOR_SCRUTINY === "true",
    enabled: db?.digioEnabled ?? process.env.DIGIO_ENABLED !== "false",
    appUrl: integration.appUrl.replace(/\/$/, ""),
  };
}

export async function isDigioConfigured(purpose?: VerificationPurpose): Promise<boolean> {
  const config = await getDigioConfig();
  if (!config.enabled) return false;
  if (!config.clientId || !config.clientSecret) return false;

  if (!purpose) {
    return !!(config.templateIdentity || config.templateBank || config.templateUndertaking);
  }

  switch (purpose) {
    case "APPLICANT_IDENTITY":
      return !!config.templateIdentity;
    case "BANK_ACCOUNT":
      return true;
    case "UNDERTAKING_IDENTITY":
      return !!(config.templateUndertaking || config.templateIdentity);
    default:
      return false;
  }
}

export function getTemplateForPurpose(
  config: DigioConfig,
  purpose: VerificationPurpose
): string | null {
  switch (purpose) {
    case "APPLICANT_IDENTITY":
      return config.templateIdentity;
    case "BANK_ACCOUNT":
      return config.templateBank;
    case "UNDERTAKING_IDENTITY":
      return config.templateUndertaking || config.templateIdentity;
    default:
      return null;
  }
}

export function mapDigioEventToStatus(event: string): import("@prisma/client").VerificationStatus {
  const normalized = event.trim().toLowerCase();
  switch (normalized) {
    case "kyc.request.approved":
      return "APPROVED";
    case "kyc.request.rejected":
      return "DECLINED";
    case "kyc.request.expired":
      return "EXPIRED";
    case "kyc.request.terminated":
      return "ABANDONED";
    case "kyc.request.review.ready":
      return "IN_REVIEW";
    case "kyc.request.completed":
      return "IN_REVIEW";
    case "kyc.request.created":
      return "IN_PROGRESS";
    default:
      return "IN_PROGRESS";
  }
}

export function mapDigioKycStatus(status: string): import("@prisma/client").VerificationStatus {
  const normalized = status.trim().toLowerCase().replace(/\s+/g, "_");
  switch (normalized) {
    case "approved":
    case "success":
    case "completed":
      return "APPROVED";
    case "rejected":
    case "failed":
    case "declined":
      return "DECLINED";
    case "expired":
      return "EXPIRED";
    case "terminated":
    case "cancelled":
    case "canceled":
      return "ABANDONED";
    case "review.ready":
    case "in_review":
    case "under_review":
      return "IN_REVIEW";
    case "requested":
    case "pending":
    case "in_progress":
      return "IN_PROGRESS";
    default:
      return "NOT_STARTED";
  }
}

export function verifyDigioWebhookSecret(
  providedSecret: string | null,
  webhookSecret: string
): boolean {
  if (!providedSecret?.trim()) return false;
  const expected = webhookSecret.trim();
  const received = providedSecret.trim();
  if (expected.length !== received.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

export function verifyDigioWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string
): boolean {
  if (!signatureHeader?.trim()) {
    return false;
  }

  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const received = signatureHeader.trim().toLowerCase();
  if (expected.length !== received.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

async function digioRequest<T>(
  config: DigioConfig,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!config.clientId || !config.clientSecret) {
    throw new DigioApiError("Digio is not configured", 503);
  }

  const baseUrl = getBaseUrl(config.environment);
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: buildAuthHeader(config.clientId, config.clientSecret),
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as T | Record<string, unknown> | null;
  if (!response.ok) {
    throw new DigioApiError(extractDigioError(payload, response.status), response.status);
  }

  return payload as T;
}

export async function createDigioKycRequest(input: {
  purpose: VerificationPurpose;
  userId: string;
  applicationId?: string | null;
  fellowshipId?: string | null;
  customerIdentifier: string;
  customerName: string;
  referenceId: string;
}): Promise<{ recordId: string; request: DigioKycRequestResponse }> {
  const config = await getDigioConfig();
  const templateName = getTemplateForPurpose(config, input.purpose);

  if (!templateName) {
    throw new DigioApiError("Digio is not configured for this verification type", 503);
  }

  const request = await digioRequest<DigioKycRequestResponse>(
    config,
    "/client/kyc/v2/request/with_template",
    {
      method: "POST",
      body: JSON.stringify({
        customer_identifier: input.customerIdentifier,
        customer_name: input.customerName,
        template_name: templateName,
        notify_customer: false,
        generate_access_token: true,
        reference_id: input.referenceId,
        transaction_id: `${input.purpose.toLowerCase()}_${Date.now()}`,
        expire_in_days: 7,
        generate_deeplink_info: false,
      }),
    }
  );

  if (!request.id) {
    throw new DigioApiError("Digio did not return a request ID", 502);
  }

  const mappedStatus = mapDigioKycStatus(request.status ?? "requested");

  const record = await prisma.verificationSession.create({
    data: {
      providerRequestId: request.id,
      accessToken: request.access_token ?? null,
      customerIdentifier: input.customerIdentifier,
      purpose: input.purpose,
      status: mappedStatus,
      referenceId: input.referenceId,
      userId: input.userId,
      applicationId: input.applicationId ?? null,
      fellowshipId: input.fellowshipId ?? null,
    },
  });

  return { recordId: record.id, request };
}

export async function verifyBankAccountWithDigio(input: {
  userId: string;
  fellowshipId: string;
  accountNumber: string;
  ifsc: string;
  accountHolderName: string;
  referenceId: string;
}): Promise<{ recordId: string; verified: boolean; response: Record<string, unknown> }> {
  const config = await getDigioConfig();

  const response = await digioRequest<Record<string, unknown>>(
    config,
    "/client/verify/bank_account",
    {
      method: "POST",
      body: JSON.stringify({
        beneficiary_account_no: input.accountNumber.trim(),
        beneficiary_ifsc: input.ifsc.trim().toUpperCase(),
        beneficiary_name: input.accountHolderName.trim(),
        validation_mode: "PENNY_DROP",
        reference_id: input.referenceId,
      }),
    }
  );

  const verified = inferBankVerificationSuccess(response);
  const mappedStatus = verified ? "APPROVED" : "DECLINED";

  const record = await prisma.verificationSession.create({
    data: {
      providerRequestId:
        (typeof response.id === "string" && response.id) ||
        `BANK_${input.fellowshipId}_${Date.now()}`,
      customerIdentifier: input.accountNumber,
      purpose: "BANK_ACCOUNT",
      status: mappedStatus,
      referenceId: input.referenceId,
      userId: input.userId,
      fellowshipId: input.fellowshipId,
      decisionJson: response as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  });

  return { recordId: record.id, verified, response };
}

function inferBankVerificationSuccess(response: Record<string, unknown>): boolean {
  if (response.verified === true) return true;
  if (response.status === true) return true;

  const status = typeof response.status === "string" ? response.status.toLowerCase() : "";
  if (["success", "verified", "completed", "approved"].includes(status)) return true;

  const nested = response.result;
  if (nested && typeof nested === "object") {
    return inferBankVerificationSuccess(nested as Record<string, unknown>);
  }

  return false;
}

export async function getLatestVerificationSession(input: {
  purpose: VerificationPurpose;
  userId?: string;
  applicationId?: string;
  fellowshipId?: string;
}) {
  return prisma.verificationSession.findFirst({
    where: {
      purpose: input.purpose,
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.applicationId ? { applicationId: input.applicationId } : {}),
      ...(input.fellowshipId ? { fellowshipId: input.fellowshipId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getVerificationPurposeLabel(purpose: VerificationPurpose): string {
  switch (purpose) {
    case "APPLICANT_IDENTITY":
      return "Applicant identity verification";
    case "BANK_ACCOUNT":
      return "Bank account verification";
    case "UNDERTAKING_IDENTITY":
      return "Undertaking identity verification";
    default:
      return "Identity verification";
  }
}

export function getVerificationStatusLabel(
  status: import("@prisma/client").VerificationStatus
): string {
  switch (status) {
    case "APPROVED":
      return "Verified";
    case "DECLINED":
      return "Declined";
    case "IN_REVIEW":
      return "Under review";
    case "IN_PROGRESS":
      return "In progress";
    case "ABANDONED":
      return "Abandoned";
    case "EXPIRED":
      return "Expired";
    case "NOT_STARTED":
    default:
      return "Not started";
  }
}

export function getDigioSdkEnvironment(config: DigioConfig): "sandbox" | "production" {
  return config.environment;
}

export async function fetchDigioKycResponse(requestId: string): Promise<Record<string, unknown> | null> {
  const config = await getDigioConfig();
  if (!config.clientId || !config.clientSecret) return null;

  try {
    return await digioRequest<Record<string, unknown>>(
      config,
      `/client/kyc/v2/${encodeURIComponent(requestId)}/response`,
      { method: "GET" }
    );
  } catch {
    return null;
  }
}

export async function refreshVerificationSessionDecision(requestId: string) {
  const session = await prisma.verificationSession.findUnique({
    where: { providerRequestId: requestId },
  });
  if (!session) return null;

  const decision = await fetchDigioKycResponse(requestId);
  if (!decision) return session;

  const statusFromDecision =
    typeof decision.status === "string"
      ? mapDigioKycStatus(decision.status)
      : session.status;

  return prisma.verificationSession.update({
    where: { id: session.id },
    data: {
      decisionJson: decision as Prisma.InputJsonValue,
      status: statusFromDecision,
      completedAt:
        ["APPROVED", "DECLINED", "ABANDONED", "EXPIRED"].includes(statusFromDecision)
          ? session.completedAt ?? new Date()
          : session.completedAt,
    },
  });
}

export function extractKycRequestFromWebhook(
  payload: DigioWebhookPayload & Record<string, unknown>
): Record<string, unknown> {
  const nested = payload.payload;
  if (nested && typeof nested === "object") {
    const kyc =
      (nested as Record<string, unknown>).kyc_request ||
      (nested as Record<string, unknown>).KYC_REQUEST;
    if (kyc && typeof kyc === "object") {
      return kyc as Record<string, unknown>;
    }
  }
  return {};
}
