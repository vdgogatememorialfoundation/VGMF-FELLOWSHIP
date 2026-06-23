import type { Prisma, VerificationPurpose } from "@prisma/client";
import prisma from "./db";
import { getIntegrationConfig } from "./integrations";

export class IdnormApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "IdnormApiError";
    this.status = status;
  }
}

export interface IdnormConfig {
  enabled: boolean;
  apiKey: string | null;
  environment: "sandbox" | "production";
  appUrl: string;
}

export async function getIdnormConfig(): Promise<IdnormConfig> {
  const integration = await getIntegrationConfig();
  const db = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
  
  return {
    enabled: db?.idnormEnabled ?? false,
    apiKey: db?.idnormApiKey || null,
    environment: db?.idnormEnvironment === "sandbox" ? "sandbox" : "production",
    appUrl: integration.appUrl.replace(/\/$/, ""),
  };
}

export async function isIdnormConfigured(): Promise<boolean> {
  const config = await getIdnormConfig();
  return !!(config.enabled && config.apiKey);
}

export async function createIdnormSession(input: {
  purpose: VerificationPurpose;
  userId: string;
  applicationId?: string | null;
  fellowshipId?: string | null;
  customerIdentifier: string;
  customerName: string;
  referenceId: string;
}): Promise<{ recordId: string; verificationUrl: string }> {
  const config = await getIdnormConfig();
  if (!config.apiKey) {
    throw new IdnormApiError("IDNorm is not configured", 503);
  }

  // TODO: Replace with actual IDNorm API call
  // For now, mock the response
  const mockSessionId = `idnorm_${Date.now()}`;
  const mockVerificationUrl = `${config.appUrl}/mock-provider/idnorm?session=${mockSessionId}`;

  const record = await prisma.verificationSession.create({
    data: {
      providerRequestId: mockSessionId,
      provider: "IDNORM",
      customerIdentifier: input.customerIdentifier,
      purpose: input.purpose,
      status: "IN_PROGRESS",
      referenceId: input.referenceId,
      userId: input.userId,
      applicationId: input.applicationId ?? null,
      fellowshipId: input.fellowshipId ?? null,
      accessToken: mockVerificationUrl, // store url in access token for now
    },
  });

  return { recordId: record.id, verificationUrl: mockVerificationUrl };
}

export async function verifyIdnormWebhookSignature(
  rawBody: string,
  signature: string | null
): Promise<boolean> {
  // TODO: Implement actual signature verification
  return true;
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
