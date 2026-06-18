import { createHmac, timingSafeEqual } from "crypto";
import type { DiditVerificationPurpose } from "@prisma/client";
import prisma from "./db";
import { getIntegrationConfig } from "./integrations";

const DIDIT_API_BASE = "https://verification.didit.me";

export type DiditSessionResponse = {
  session_id: string;
  session_token?: string;
  url: string;
  verification_url?: string;
  status: string;
};

function getSessionVerificationUrl(session: DiditSessionResponse): string {
  return session.url || session.verification_url || "";
}

function extractDiditError(payload: unknown, status: number): string {
  if (!payload || typeof payload !== "object") {
    return `Didit session creation failed (${status})`;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail;
  }
  if (Array.isArray(record.detail)) {
    const parts = record.detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg?: unknown }).msg ?? item);
        }
        return JSON.stringify(item);
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join("; ");
  }
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }

  return `Didit session creation failed (${status})`;
}

export type DiditWebhookPayload = {
  session_id: string;
  status: string;
  vendor_data?: string;
  decision?: Record<string, unknown>;
};

export interface DiditConfig {
  apiKey: string | null;
  webhookSecret: string | null;
  workflowIdIdentity: string | null;
  workflowIdBank: string | null;
  workflowIdUndertaking: string | null;
  requireIdentityForScrutiny: boolean;
  appUrl: string;
}

export async function getDiditConfig(): Promise<DiditConfig> {
  const integration = await getIntegrationConfig();
  const db = await prisma.integrationSettings.findUnique({ where: { id: "default" } });

  return {
    apiKey: (db?.diditApiKey || process.env.DIDIT_API_KEY || null)?.trim() || null,
    webhookSecret:
      (db?.diditWebhookSecret || process.env.DIDIT_WEBHOOK_SECRET || null)?.trim() || null,
    workflowIdIdentity:
      (
        db?.diditWorkflowIdIdentity ||
        process.env.DIDIT_WORKFLOW_ID ||
        process.env.DIDIT_WORKFLOW_ID_IDENTITY ||
        null
      )?.trim() || null,
    workflowIdBank:
      (db?.diditWorkflowIdBank || process.env.DIDIT_WORKFLOW_ID_BANK || null)?.trim() || null,
    workflowIdUndertaking:
      (
        db?.diditWorkflowIdUndertaking || process.env.DIDIT_WORKFLOW_ID_UNDERTAKING || null
      )?.trim() || null,
    requireIdentityForScrutiny:
      db?.diditRequireIdentityForScrutiny ??
      process.env.DIDIT_REQUIRE_IDENTITY_FOR_SCRUTINY === "true",
    appUrl: integration.appUrl.replace(/\/$/, ""),
  };
}

export async function isDiditConfigured(purpose?: DiditVerificationPurpose): Promise<boolean> {
  const config = await getDiditConfig();
  if (!config.apiKey || !config.webhookSecret) return false;

  if (!purpose) {
    return !!(
      config.workflowIdIdentity ||
      config.workflowIdBank ||
      config.workflowIdUndertaking
    );
  }

  switch (purpose) {
    case "APPLICANT_IDENTITY":
      return !!config.workflowIdIdentity;
    case "BANK_ACCOUNT":
      return !!config.workflowIdBank;
    case "UNDERTAKING_IDENTITY":
      return !!config.workflowIdUndertaking;
    default:
      return false;
  }
}

export function getWorkflowIdForPurpose(
  config: DiditConfig,
  purpose: DiditVerificationPurpose
): string | null {
  switch (purpose) {
    case "APPLICANT_IDENTITY":
      return config.workflowIdIdentity;
    case "BANK_ACCOUNT":
      return config.workflowIdBank;
    case "UNDERTAKING_IDENTITY":
      return config.workflowIdUndertaking;
    default:
      return null;
  }
}

export function mapDiditStatus(status: string): import("@prisma/client").DiditVerificationStatus {
  const normalized = status.trim().toUpperCase().replace(/\s+/g, "_");
  switch (normalized) {
    case "APPROVED":
      return "APPROVED";
    case "DECLINED":
      return "DECLINED";
    case "IN_REVIEW":
      return "IN_REVIEW";
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "ABANDONED":
      return "ABANDONED";
    case "EXPIRED":
      return "EXPIRED";
    case "NOT_STARTED":
      return "NOT_STARTED";
    default:
      return "NOT_STARTED";
  }
}

export function verifyDiditWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  timestampHeader?: string | null
): boolean {
  if (!signatureHeader?.trim()) return false;

  const received = signatureHeader.trim().toLowerCase();

  if (timestampHeader) {
    const timestamp = parseInt(timestampHeader, 10);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > 300) {
      return false;
    }
  }

  let expectedRaw = "";
  let expectedCanonical = "";

  try {
    expectedRaw = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

    const parsed = JSON.parse(rawBody) as unknown;
    const canonical = JSON.stringify(sortWebhookKeys(shortenWebhookFloats(parsed)));
    expectedCanonical = createHmac("sha256", webhookSecret)
      .update(canonical, "utf8")
      .digest("hex");
  } catch {
    return false;
  }

  for (const expected of [expectedCanonical, expectedRaw]) {
    if (expected.length !== received.length) continue;
    try {
      if (timingSafeEqual(Buffer.from(expected), Buffer.from(received))) {
        return true;
      }
    } catch {
      // try next format
    }
  }

  return false;
}

function shortenWebhookFloats(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(shortenWebhookFloats);
  }
  if (data !== null && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([key, value]) => [
        key,
        shortenWebhookFloats(value),
      ])
    );
  }
  if (typeof data === "number" && Number.isFinite(data) && Number.isInteger(data)) {
    return data;
  }
  if (typeof data === "number" && Number.isFinite(data) && data % 1 === 0) {
    return Math.trunc(data);
  }
  return data;
}

function sortWebhookKeys(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(sortWebhookKeys);
  }
  if (data !== null && typeof data === "object") {
    return Object.keys(data as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortWebhookKeys((data as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return data;
}

export async function createDiditSession(input: {
  purpose: DiditVerificationPurpose;
  userId: string;
  applicationId?: string | null;
  fellowshipId?: string | null;
  vendorData: string;
  callbackPath?: string;
}): Promise<{ recordId: string; session: DiditSessionResponse }> {
  const config = await getDiditConfig();
  const workflowId = getWorkflowIdForPurpose(config, input.purpose);

  if (!config.apiKey || !workflowId) {
    throw new Error("Didit is not configured for this verification type");
  }

  const callback =
    input.callbackPath ??
    `${config.appUrl}/applicant/verification?purpose=${input.purpose}`;

  const response = await fetch(`${DIDIT_API_BASE}/v3/session/`, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      callback,
      vendor_data: input.vendorData,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | DiditSessionResponse
    | { detail?: string | unknown[]; message?: string }
    | null;

  if (!response.ok || !payload || !("session_id" in payload)) {
    throw new Error(extractDiditError(payload, response.status));
  }

  const session = payload as DiditSessionResponse;
  const verificationUrl = getSessionVerificationUrl(session);
  if (!verificationUrl) {
    throw new Error("Didit response did not include a verification URL");
  }

  const mappedStatus = mapDiditStatus(session.status);

  const record = await prisma.diditVerificationSession.create({
    data: {
      diditSessionId: session.session_id,
      sessionToken: session.session_token ?? null,
      verificationUrl,
      purpose: input.purpose,
      status: mappedStatus,
      vendorData: input.vendorData,
      userId: input.userId,
      applicationId: input.applicationId ?? null,
      fellowshipId: input.fellowshipId ?? null,
    },
  });

  return { recordId: record.id, session: { ...session, url: verificationUrl } };
}

export async function getLatestDiditSession(input: {
  purpose: DiditVerificationPurpose;
  userId?: string;
  applicationId?: string;
  fellowshipId?: string;
}) {
  return prisma.diditVerificationSession.findFirst({
    where: {
      purpose: input.purpose,
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.applicationId ? { applicationId: input.applicationId } : {}),
      ...(input.fellowshipId ? { fellowshipId: input.fellowshipId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getDiditPurposeLabel(purpose: DiditVerificationPurpose): string {
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

export function getDiditStatusLabel(status: import("@prisma/client").DiditVerificationStatus): string {
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
