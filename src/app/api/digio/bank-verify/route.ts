import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  DigioApiError,
  isDigioConfigured,
  verifyBankAccountWithDigio,
} from "@/lib/digio";
import { getFellowshipForApplicant } from "@/lib/fellowship-access";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isDigioConfigured("BANK_ACCOUNT"))) {
    return NextResponse.json(
      { error: "Digio bank verification is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as { fellowshipId?: string };
    const fellowship = body.fellowshipId
      ? await getFellowshipForApplicant(user.id, body.fellowshipId)
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

    if (
      !fellowship.bankAccountNumber?.trim() ||
      !fellowship.bankIfsc?.trim() ||
      !fellowship.bankAccountHolder?.trim()
    ) {
      return NextResponse.json(
        { error: "Bank account number, IFSC, and account holder name are required" },
        { status: 400 }
      );
    }

    if (fellowship.bankVerificationStatus === "APPROVED") {
      return NextResponse.json({
        status: fellowship.bankVerificationStatus,
        verified: true,
        reused: true,
      });
    }

    const referenceId = [
      "BANK_ACCOUNT",
      user.id,
      "",
      fellowship.id,
      Date.now().toString(),
    ].join(":");

    const result = await verifyBankAccountWithDigio({
      userId: user.id,
      fellowshipId: fellowship.id,
      accountNumber: fellowship.bankAccountNumber,
      ifsc: fellowship.bankIfsc,
      accountHolderName: fellowship.bankAccountHolder,
      referenceId,
    });

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.fellowship.update({
        where: { id: fellowship.id },
        data: {
          bankVerificationStatus: result.verified ? "APPROVED" : "DECLINED",
          bankDigioVerifiedAt: result.verified ? now : null,
          bankVerifiedAt: result.verified ? fellowship.bankVerifiedAt ?? now : null,
          currentStage:
            result.verified && fellowship.currentStage === "BANK_VERIFICATION"
              ? "SANCTIONED"
              : fellowship.currentStage,
        },
      });
    });

    return NextResponse.json({
      status: result.verified ? "APPROVED" : "DECLINED",
      verified: result.verified,
      requestId: result.recordId,
    });
  } catch (error) {
    console.error("Digio bank verify error:", error);
    if (error instanceof DigioApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to verify bank account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fellowshipId = request.nextUrl.searchParams.get("fellowshipId") ?? undefined;
  const fellowship = fellowshipId
    ? await getFellowshipForApplicant(user.id, fellowshipId)
    : await getFellowshipForApplicant(user.id);

  if (!fellowship) {
    return NextResponse.json({ error: "No fellowship found" }, { status: 404 });
  }

  return NextResponse.json({
    configured: await isDigioConfigured("BANK_ACCOUNT"),
    status: fellowship.bankVerificationStatus,
    verifiedAt: fellowship.bankDigioVerifiedAt ?? fellowship.bankVerifiedAt,
  });
}
