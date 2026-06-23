import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { verifySetuBankAccount } from "@/lib/setu";
import { isBankOnlineAvailable } from "@/lib/manual-verification";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountNumber, ifsc } = await req.json();

    if (!accountNumber || !ifsc) {
      return NextResponse.json({ error: "Account Number and IFSC are required" }, { status: 400 });
    }

    const isAvailable = await isBankOnlineAvailable();
    if (!isAvailable) {
      return NextResponse.json({ error: "Online bank verification is currently unavailable" }, { status: 503 });
    }

    const verificationResult = await verifySetuBankAccount(accountNumber, ifsc);

    // Save result to the database
    const verificationSession = await prisma.verificationSession.create({
      data: {
        userId: session.userId,
        provider: "SETU",
        providerRequestId: `bav_${Date.now()}`,
        purpose: "BANK_ACCOUNT",
        status: verificationResult.success ? "APPROVED" : "DECLINED",
        referenceId: "BAV",
        decisionJson: verificationResult,
        completedAt: new Date(),
      }
    });

    return NextResponse.json(verificationResult);
  } catch (error: any) {
    console.error("Bank Verification Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to verify bank account" 
    }, { status: error.status || 500 });
  }
}
