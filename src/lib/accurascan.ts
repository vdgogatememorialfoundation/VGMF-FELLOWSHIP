import type { Prisma, VerificationPurpose } from "@prisma/client";
import prisma from "./db";
import { getIntegrationConfig } from "./integrations";

export class AccurascanApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AccurascanApiError";
    this.status = status;
  }
}

export interface AccurascanConfig {
  enabled: boolean;
  apiKey: string | null;
  apiSecret: string | null;
  environment: "sandbox" | "production";
  appUrl: string;
}

export async function getAccurascanConfig(): Promise<AccurascanConfig> {
  const integration = await getIntegrationConfig();
  const db = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
  
  return {
    enabled: db?.accurascanEnabled ?? false,
    apiKey: db?.accurascanApiKey || null,
    apiSecret: null,
    environment: db?.accurascanEnvironment === "sandbox" ? "sandbox" : "production",
    appUrl: integration.appUrl.replace(/\/$/, ""),
  };
}

export async function isAccurascanConfigured(): Promise<boolean> {
  const config = await getAccurascanConfig();
  return !!(config.enabled && config.apiKey && config.apiSecret);
}

export async function createAccurascanSession(input: {
  purpose: VerificationPurpose;
  userId: string;
  applicationId?: string | null;
  fellowshipId?: string | null;
  customerIdentifier: string;
  customerName: string;
  referenceId: string;
}): Promise<{ recordId: string; verificationUrl: string }> {
  const config = await getAccurascanConfig();
  if (!config.apiKey || !config.apiSecret) {
    throw new AccurascanApiError("Accurascan is not configured", 503);
  }



  // TODO: Replace with actual Accurascan API call
  // For now, mock the response
  const mockSessionId = `accurascan_${Date.now()}`;
  const mockVerificationUrl = `https://verify.accurascan.com/session/${mockSessionId}`;

  const record = await prisma.verificationSession.create({
    data: {
      providerRequestId: mockSessionId,
      provider: "ACCURASCAN",
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

export async function verifyAccurascanWebhookSignature(
  rawBody: string,
  signature: string | null
): Promise<boolean> {
  // TODO: Implement actual signature verification
  return true;
}
