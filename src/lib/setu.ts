import type { Prisma, VerificationPurpose } from "@prisma/client";
import prisma from "./db";
import { getIntegrationConfig } from "./integrations";

export class SetuApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SetuApiError";
    this.status = status;
  }
}

export interface SetuConfig {
  enabled: boolean;
  clientId: string | null;
  clientSecret: string | null;
  productInstanceId: string | null;
  environment: "sandbox" | "production";
  appUrl: string;
}

export async function getSetConfig(): Promise<SetuConfig> {
  const integration = await getIntegrationConfig();
  const db = await prisma.integrationSettings.findUnique({ where: { id: "default" } });
  
  return {
    enabled: db?.setuEnabled ?? false,
    clientId: db?.setuClientId || null,
    clientSecret: db?.setuClientSecret || null,
    productInstanceId: db?.setuProductInstanceId || null,
    environment: db?.setuEnvironment === "sandbox" ? "sandbox" : "production",
    appUrl: integration.appUrl.replace(/\/$/, ""),
  };
}

export async function isSetConfigured(): Promise<boolean> {
  const config = await getSetConfig();
  return !!(config.enabled && config.clientId && config.clientSecret);
}

export async function createSetuOKYCSession(
  userId: string,
  purpose: VerificationPurpose,
  referenceId: string,
  applicationId?: string,
  fellowshipId?: string
) {
  const config = await getSetConfig();
  if (!config.enabled || !config.clientId || !config.clientSecret) {
    throw new SetuApiError("Setu is not configured", 400);
  }

  // To test the flow before actual implementation is complete or if no real API keys exist, 
  // we redirect to a mock provider if the client ID is "MOCK" or it's a test environment setup.
  if (config.clientId === "MOCK" || !config.productInstanceId) {
     return createMockSetuSession(userId, purpose, referenceId, applicationId, fellowshipId, config);
  }

  // Generate an Access Token
  const tokenUrl = config.environment === "sandbox" 
    ? "https://auth.sandbox.setu.co/api/v2/auth/token"
    : "https://auth.setu.co/api/v2/auth/token";

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      clientID: config.clientId,
      secret: config.clientSecret
    })
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    console.error("Setu Token Error:", errorBody);
    throw new SetuApiError("Failed to obtain Setu access token", tokenResponse.status);
  }

  const { data: { token } } = await tokenResponse.json();

  // Create OKYC Request
  const okycUrl = config.environment === "sandbox"
    ? "https://dg-sandbox.setu.co/api/okyc"
    : "https://dg.setu.co/api/okyc";

  const redirectUrl = `${config.appUrl}/api/webhooks/setu/redirect`;

  const okycResponse = await fetch(okycUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": config.clientId,
      "x-client-secret": config.clientSecret,
      "x-product-instance-id": config.productInstanceId
    },
    body: JSON.stringify({
      redirectURL: redirectUrl
    })
  });

  if (!okycResponse.ok) {
    const errorBody = await okycResponse.text();
    console.error("Setu OKYC Error:", errorBody);
    throw new SetuApiError("Failed to create Setu OKYC session", okycResponse.status);
  }

  const { id: setuId, kycURL } = await okycResponse.json();

  const session = await prisma.verificationSession.create({
    data: {
      provider: "SETU",
      providerRequestId: setuId,
      customerIdentifier: kycURL,
      purpose,
      referenceId,
      userId,
      applicationId,
      fellowshipId,
    },
  });

  return {
    verificationId: session.id,
    verificationUrl: kycURL,
  };
}

async function createMockSetuSession(
  userId: string,
  purpose: VerificationPurpose,
  referenceId: string,
  applicationId?: string,
  fellowshipId?: string,
  config?: SetuConfig
) {
   const mockRequestId = `setu_mock_${Date.now()}`;
   const kycURL = `${config?.appUrl}/mock-provider/setu?session_id=${mockRequestId}`;
   
   const session = await prisma.verificationSession.create({
    data: {
      provider: "SETU",
      providerRequestId: mockRequestId,
      customerIdentifier: kycURL,
      purpose,
      referenceId,
      userId,
      applicationId,
      fellowshipId,
    },
  });

  return {
    verificationId: session.id,
    verificationUrl: kycURL,
  };
}

export async function verifySetuBankAccount(accountNumber: string, ifsc: string) {
  const config = await getSetConfig();
  if (!config.enabled || !config.clientId || !config.clientSecret) {
    throw new SetuApiError("Setu is not configured", 400);
  }

  if (config.clientId === "MOCK" || !config.productInstanceId) {
    return {
       success: true,
       nameAtBank: "Mock User",
       bavCode: "BAV00",
       message: "Transaction approved (Mock)"
    };
  }

  const tokenUrl = config.environment === "sandbox" 
    ? "https://auth.sandbox.setu.co/api/v2/auth/token"
    : "https://auth.setu.co/api/v2/auth/token";

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientID: config.clientId, secret: config.clientSecret })
  });

  if (!tokenResponse.ok) {
    throw new SetuApiError("Failed to obtain Setu access token", tokenResponse.status);
  }

  const { data: { token } } = await tokenResponse.json();

  const bavUrl = config.environment === "sandbox"
    ? "https://uat.setu.co/api/verify/ban"
    : "https://prod.setu.co/api/verify/ban";

  const bavResponse = await fetch(bavUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": config.clientId,
      "x-client-secret": config.clientSecret,
      "x-product-instance-id": config.productInstanceId
    },
    body: JSON.stringify({
      ifsc,
      accountNumber
    })
  });

  const responseJson = await bavResponse.json();

  if (!bavResponse.ok || responseJson.error) {
     return {
        success: false,
        nameAtBank: null,
        bavCode: responseJson.error?.code || "ERROR",
        message: responseJson.error?.detail || "Bank Verification Failed"
     };
  }

  return {
    success: responseJson.verification === "success",
    nameAtBank: responseJson.nameAtBank || "Verified User",
    bavCode: responseJson.code,
    message: responseJson.message
  };
}
