import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { VerificationPurpose } from "@prisma/client";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  createDigioKycRequest,
  getDigioConfig,
  getLatestVerificationSession,
  isDigioConfigured,
  DigioApiError,
  getDigioSdkEnvironment,
} from "@/lib/digio";
import { getFellowshipForApplicant } from "@/lib/fellowship-access";

const purposeSchema = z.enum([
  "APPLICANT_IDENTITY",
  "BANK_ACCOUNT",
  "UNDERTAKING_IDENTITY",
]);

const createSessionSchema = z.object({
  purpose: purposeSchema,
  applicationId: z.string().optional(),
  fellowshipId: z.string().optional(),
  forceNew: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = createSessionSchema.parse(await request.json());
    const purpose = body.purpose as VerificationPurpose;
    const forceNew = body.forceNew === true;

    if (purpose === "BANK_ACCOUNT") {
      return NextResponse.json(
        { error: "Use bank verification on the fellowship page for penny drop verification." },
        { status: 400 }
      );
    }

    if (!(await isDigioConfigured(purpose))) {
      return NextResponse.json(
        { error: "Digio verification is not configured for this step" },
        { status: 503 }
      );
    }

    let applicationId = body.applicationId ?? null;
    const fellowshipId = body.fellowshipId ?? null;

    if (purpose === "APPLICANT_IDENTITY" || purpose === "UNDERTAKING_IDENTITY") {
      const application = applicationId
        ? await prisma.application.findFirst({
            where: { id: applicationId, userId: user.id },
          })
        : await prisma.application.findFirst({
            where: {
              userId: user.id,
              status: { notIn: ["DRAFT", "INCOMPLETE", "WITHDRAWN"] },
            },
            orderBy: { updatedAt: "desc" },
          });

      if (!application) {
        return NextResponse.json({ error: "No submitted application found" }, { status: 404 });
      }

      applicationId = application.id;

      if (purpose === "UNDERTAKING_IDENTITY" && !application.undertakingAcceptedAt) {
        return NextResponse.json(
          { error: "Complete the digital undertaking before identity verification" },
          { status: 400 }
        );
      }
    }

    const latest = await getLatestVerificationSession({
      purpose,
      userId: user.id,
      applicationId: applicationId ?? undefined,
      fellowshipId: fellowshipId ?? undefined,
    });

    if (
      !forceNew &&
      latest &&
      ["APPROVED", "IN_REVIEW"].includes(latest.status)
    ) {
      return NextResponse.json({
        requestId: latest.providerRequestId,
        customerIdentifier: latest.customerIdentifier,
        accessToken: latest.accessToken,
        status: latest.status,
        environment: (await getDigioConfig()).environment,
        reused: true,
      });
    }

    if (
      !forceNew &&
      latest &&
      latest.status === "IN_PROGRESS" &&
      latest.providerRequestId
    ) {
      return NextResponse.json({
        requestId: latest.providerRequestId,
        customerIdentifier: latest.customerIdentifier,
        accessToken: latest.accessToken,
        status: latest.status,
        environment: (await getDigioConfig()).environment,
        reused: true,
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true, email: true, profile: { select: { name: true } } },
    });

    const customerIdentifier = dbUser?.phone?.trim() || dbUser?.email.trim() || user.email.trim();
    const customerName = dbUser?.profile?.name?.trim() || user.name.trim() || user.email.split("@")[0];

    const referenceId = [
      purpose,
      user.id,
      applicationId ?? "",
      fellowshipId ?? "",
      Date.now().toString(),
    ].join(":");

    const { request: digioRequest } = await createDigioKycRequest({
      purpose,
      userId: user.id,
      applicationId,
      fellowshipId,
      customerIdentifier,
      customerName,
      referenceId,
    });

    const config = await getDigioConfig();

    return NextResponse.json({
      requestId: digioRequest.id,
      customerIdentifier,
      accessToken: digioRequest.access_token ?? null,
      status: digioRequest.status ?? "requested",
      environment: getDigioSdkEnvironment(config),
      reused: false,
    });
  } catch (error) {
    console.error("Digio session error:", error);
    if (error instanceof DigioApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to create verification session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const purpose = request.nextUrl.searchParams.get("purpose") as VerificationPurpose | null;
  const applicationId = request.nextUrl.searchParams.get("applicationId") ?? undefined;
  const fellowshipId = request.nextUrl.searchParams.get("fellowshipId") ?? undefined;

  if (!purpose || !purposeSchema.safeParse(purpose).success) {
    return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  }

  const configured = await isDigioConfigured(purpose);

  const latest = await getLatestVerificationSession({
    purpose,
    userId: user.id,
    applicationId,
    fellowshipId,
  });

  let summaryStatus = latest?.status ?? "NOT_STARTED";

  if (purpose === "APPLICANT_IDENTITY" || purpose === "UNDERTAKING_IDENTITY") {
    const application = applicationId
      ? await prisma.application.findFirst({
          where: { id: applicationId, userId: user.id },
          select: { identityVerificationStatus: true, identityVerifiedAt: true },
        })
      : await prisma.application.findFirst({
          where: { userId: user.id, status: { notIn: ["DRAFT", "INCOMPLETE", "WITHDRAWN"] } },
          orderBy: { updatedAt: "desc" },
          select: { identityVerificationStatus: true, identityVerifiedAt: true },
        });

    if (application) {
      summaryStatus = application.identityVerificationStatus;
    }
  }

  if (purpose === "BANK_ACCOUNT") {
    const fellowship = fellowshipId
      ? await getFellowshipForApplicant(user.id, fellowshipId)
      : await getFellowshipForApplicant(user.id);

    if (fellowship) {
      summaryStatus = fellowship.bankVerificationStatus;
    }
  }

  const config = await getDigioConfig();

  return NextResponse.json({
    configured,
    purpose,
    status: summaryStatus,
    environment: config.environment,
    session: latest
      ? {
          id: latest.providerRequestId,
          status: latest.status,
          customerIdentifier: latest.customerIdentifier,
          completedAt: latest.completedAt,
          createdAt: latest.createdAt,
          updatedAt: latest.updatedAt,
        }
      : null,
  });
}
