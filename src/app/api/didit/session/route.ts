import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { DiditVerificationPurpose } from "@prisma/client";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  createDiditSession,
  buildDiditCallbackUrl,
  getDiditConfig,
  getLatestDiditSession,
  isDiditConfigured,
  DiditApiError,
} from "@/lib/didit";
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
    const purpose = body.purpose as DiditVerificationPurpose;
    const forceNew = body.forceNew === true;

    if (!(await isDiditConfigured(purpose))) {
      return NextResponse.json(
        { error: "Didit verification is not configured for this step" },
        { status: 503 }
      );
    }

    let applicationId = body.applicationId ?? null;
    let fellowshipId = body.fellowshipId ?? null;

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

    if (purpose === "BANK_ACCOUNT") {
      const fellowship = fellowshipId
        ? await getFellowshipForApplicant(user.id, fellowshipId)
        : await getFellowshipForApplicant(user.id);

      if (!fellowship) {
        return NextResponse.json({ error: "No fellowship found" }, { status: 404 });
      }

      if (!fellowship.bankSubmittedAt) {
        return NextResponse.json(
          { error: "Submit bank details before starting bank verification" },
          { status: 400 }
        );
      }

      fellowshipId = fellowship.id;
    }

    const latest = await getLatestDiditSession({
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
        sessionId: latest.diditSessionId,
        verificationUrl: latest.verificationUrl,
        status: latest.status,
        reused: true,
      });
    }

    if (
      !forceNew &&
      latest &&
      latest.status === "IN_PROGRESS" &&
      latest.verificationUrl
    ) {
      return NextResponse.json({
        sessionId: latest.diditSessionId,
        verificationUrl: latest.verificationUrl,
        status: latest.status,
        reused: true,
      });
    }

    const diditConfig = await getDiditConfig();

    const vendorData = [
      purpose,
      user.id,
      applicationId ?? "",
      fellowshipId ?? "",
      Date.now().toString(),
    ].join(":");

    const callbackPath = buildDiditCallbackUrl(
      diditConfig.appUrl,
      purpose === "BANK_ACCOUNT"
        ? "/applicant/fellowship?verified=bank"
        : purpose === "UNDERTAKING_IDENTITY"
          ? "/applicant/undertaking?verified=identity"
          : "/applicant/verification?verified=identity"
    );

    const { session } = await createDiditSession({
      purpose,
      userId: user.id,
      applicationId,
      fellowshipId,
      vendorData,
      callbackPath,
    });

    return NextResponse.json({
      sessionId: session.session_id,
      verificationUrl: session.url || session.verification_url,
      status: session.status,
      reused: false,
    });
  } catch (error) {
    console.error("Didit session error:", error);
    if (error instanceof DiditApiError) {
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

  const purpose = request.nextUrl.searchParams.get("purpose") as DiditVerificationPurpose | null;
  const applicationId = request.nextUrl.searchParams.get("applicationId") ?? undefined;
  const fellowshipId = request.nextUrl.searchParams.get("fellowshipId") ?? undefined;

  if (!purpose || !purposeSchema.safeParse(purpose).success) {
    return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  }

  const configured = await isDiditConfigured(purpose);

  const latest = await getLatestDiditSession({
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

  return NextResponse.json({
    configured,
    purpose,
    status: summaryStatus,
    session: latest
      ? {
          id: latest.diditSessionId,
          status: latest.status,
          verificationUrl: latest.verificationUrl,
          completedAt: latest.completedAt,
          createdAt: latest.createdAt,
          updatedAt: latest.updatedAt,
        }
      : null,
  });
}
