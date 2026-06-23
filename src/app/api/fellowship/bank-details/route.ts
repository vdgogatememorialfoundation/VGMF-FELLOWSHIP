import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ensureApplicantFellowship, getFellowshipForApplicant } from "@/lib/fellowship-access";
import { isBankOnlineAvailable } from "@/lib/manual-verification";

function maskAccountNumber(value: string) {
  if (value.length <= 4) return value;
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

function normalizeIfsc(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fellowship = await getFellowshipForApplicant(user.id);

  if (!fellowship) {
    return NextResponse.json({ bankDetails: null });
  }

  return NextResponse.json({
    bankDetails: {
      fellowshipId: fellowship.id,
      accountHolder: fellowship.bankAccountHolder,
      bankName: fellowship.bankName,
      accountNumber: fellowship.bankAccountNumber
        ? maskAccountNumber(fellowship.bankAccountNumber)
        : null,
      ifsc: fellowship.bankIfsc,
      branch: fellowship.bankBranch,
      submittedAt: fellowship.bankSubmittedAt,
      verifiedAt: fellowship.bankVerifiedAt,
      isSubmitted: Boolean(fellowship.bankSubmittedAt),
      isVerified: Boolean(fellowship.bankVerifiedAt),
      currentStage: fellowship.currentStage,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fellowshipId, accountHolder, bankName, accountNumber, ifsc, branch } = body;

    if (!accountHolder?.trim() || !bankName?.trim() || !ifsc?.trim()) {
      return NextResponse.json(
        { error: "Account holder, bank name, and IFSC are required" },
        { status: 400 }
      );
    }

    const fellowship = fellowshipId
      ? await getFellowshipForApplicant(user.id, fellowshipId)
      : (await ensureApplicantFellowship(user.id)).fellowship;

    if (!fellowship) {
      return NextResponse.json(
        {
          error:
            "No fellowship found yet. Please wait for trustee approval or contact the Foundation admin.",
        },
        { status: 404 }
      );
    }

    const normalizedIfsc = normalizeIfsc(String(ifsc));
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizedIfsc)) {
      return NextResponse.json(
        { error: "Enter a valid 11-character IFSC code (e.g. SBIN0001234)" },
        { status: 400 }
      );
    }

    const accountDigits = String(accountNumber || "").replace(/\D/g, "");
    const resolvedAccount =
      accountDigits.length >= 9
        ? accountDigits
        : fellowship.bankAccountNumber || "";

    if (resolvedAccount.length < 9 || resolvedAccount.length > 18) {
      return NextResponse.json(
        { error: "Enter a valid bank account number (9–18 digits)" },
        { status: 400 }
      );
    }

    const updated = await prisma.fellowship.update({
      where: { id: fellowship.id },
      data: {
        bankAccountHolder: String(accountHolder).trim(),
        bankName: String(bankName).trim(),
        bankAccountNumber: resolvedAccount,
        bankIfsc: normalizedIfsc,
        bankBranch: branch?.trim() || null,
        bankSubmittedAt: new Date(),
        bankVerifiedAt: null,
        bankVerificationStatus: (await isBankOnlineAvailable()) ? "NOT_STARTED" : "IN_PROGRESS",
        currentStage:
          fellowship.currentStage === "AGREEMENT_PENDING"
            ? "BANK_VERIFICATION"
            : fellowship.currentStage,
      },
    });

    return NextResponse.json({
      success: true,
      bankDetails: {
        fellowshipId: updated.id,
        isSubmitted: true,
        isVerified: false,
        currentStage: updated.currentStage,
      },
    });
  } catch (error) {
    console.error("Bank details error:", error);
    const message = error instanceof Error ? error.message : "Failed to save bank details";
    return NextResponse.json(
      {
        error:
          message.includes("Unknown arg") || message.includes("column")
            ? "Bank details could not be saved — database sync pending. Please try again shortly."
            : "Failed to save bank details. Please check all fields and try again.",
        detail: process.env.NODE_ENV !== "production" ? message : undefined,
      },
      { status: 500 }
    );
  }
}
