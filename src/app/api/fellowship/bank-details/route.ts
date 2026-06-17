import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

function maskAccountNumber(value: string) {
  if (value.length <= 4) return value;
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fellowship = await prisma.fellowship.findFirst({
    where: { application: { userId: user.id } },
    select: {
      id: true,
      bankAccountHolder: true,
      bankName: true,
      bankAccountNumber: true,
      bankIfsc: true,
      bankBranch: true,
      bankSubmittedAt: true,
      bankVerifiedAt: true,
      currentStage: true,
    },
  });

  if (!fellowship) {
    return NextResponse.json({ bankDetails: null });
  }

  return NextResponse.json({
    bankDetails: {
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

    if (!fellowshipId || !accountHolder?.trim() || !bankName?.trim() || !accountNumber?.trim() || !ifsc?.trim()) {
      return NextResponse.json(
        { error: "Account holder, bank name, account number, and IFSC are required" },
        { status: 400 }
      );
    }

    const fellowship = await prisma.fellowship.findFirst({
      where: {
        id: fellowshipId,
        application: { userId: user.id },
      },
    });

    if (!fellowship) {
      return NextResponse.json({ error: "Fellowship not found" }, { status: 404 });
    }

    const normalizedIfsc = String(ifsc).trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizedIfsc)) {
      return NextResponse.json({ error: "Enter a valid IFSC code" }, { status: 400 });
    }

    const accountDigits = String(accountNumber).replace(/\D/g, "");
    if (accountDigits.length < 9 || accountDigits.length > 18) {
      return NextResponse.json({ error: "Enter a valid bank account number" }, { status: 400 });
    }

    const updated = await prisma.fellowship.update({
      where: { id: fellowshipId },
      data: {
        bankAccountHolder: String(accountHolder).trim(),
        bankName: String(bankName).trim(),
        bankAccountNumber: accountDigits,
        bankIfsc: normalizedIfsc,
        bankBranch: branch?.trim() || null,
        bankSubmittedAt: new Date(),
        bankVerifiedAt: null,
        currentStage:
          fellowship.currentStage === "AGREEMENT_PENDING"
            ? "BANK_VERIFICATION"
            : fellowship.currentStage,
      },
    });

    return NextResponse.json({
      success: true,
      bankDetails: {
        isSubmitted: true,
        isVerified: false,
        currentStage: updated.currentStage,
      },
    });
  } catch (error) {
    console.error("Bank details error:", error);
    return NextResponse.json({ error: "Failed to save bank details" }, { status: 500 });
  }
}
