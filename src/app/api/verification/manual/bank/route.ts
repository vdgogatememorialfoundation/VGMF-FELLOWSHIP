import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFellowshipForApplicant } from "@/lib/fellowship-access";
import prisma from "@/lib/db";
import { isDigioBankAvailable, syncManualBankVerification } from "@/lib/manual-verification";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fellowshipId = request.nextUrl.searchParams.get("fellowshipId") ?? undefined;
  const isStaff = ["ADMIN", "STAFF", "FINANCE"].includes(user.role);

  let fellowship = null as Awaited<ReturnType<typeof getFellowshipForApplicant>> | Awaited<
    ReturnType<typeof prisma.fellowship.findUnique>
  > | null;

  if (fellowshipId) {
    if (isStaff) {
      fellowship = await prisma.fellowship.findUnique({
        where: { id: fellowshipId },
        include: {
          fellowshipDocuments: {
            where: { type: "BANK_VERIFICATION" },
            orderBy: { uploadedAt: "desc" },
            take: 1,
          },
        },
      });
    } else {
      fellowship = await getFellowshipForApplicant(user.id, fellowshipId);
    }
  } else if (!isStaff) {
    fellowship = await getFellowshipForApplicant(user.id);
  }

  if (!fellowship) {
    return NextResponse.json({ error: "Fellowship not found" }, { status: 404 });
  }

  const bankDoc =
    "fellowshipDocuments" in fellowship && fellowship.fellowshipDocuments
      ? fellowship.fellowshipDocuments[0]
      : await prisma.fellowshipDocument.findFirst({
          where: { fellowshipId: fellowship.id, type: "BANK_VERIFICATION" },
          orderBy: { uploadedAt: "desc" },
        });

  const digioAvailable = await isDigioBankAvailable();

  return NextResponse.json({
    mode: digioAvailable ? "digio" : "manual",
    digioAvailable,
    status: fellowship.bankVerificationStatus,
    verifiedAt: fellowship.bankVerifiedAt ?? fellowship.bankDigioVerifiedAt,
    bankDetails: {
      accountHolder: fellowship.bankAccountHolder,
      bankName: fellowship.bankName,
      ifsc: fellowship.bankIfsc,
      branch: fellowship.bankBranch,
      submittedAt: fellowship.bankSubmittedAt,
    },
    proofDocument: bankDoc
      ? {
          id: bankDoc.id,
          fileName: bankDoc.fileName,
          filePath: bankDoc.filePath,
          status: bankDoc.status,
          rejectionReason: bankDoc.rejectionReason,
        }
      : null,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "FINANCE"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      fellowshipId?: string;
      action?: "approve" | "decline" | "request_resubmit";
      notes?: string;
    };

    const { fellowshipId, action, notes } = body;

    if (!fellowshipId || !action) {
      return NextResponse.json({ error: "fellowshipId and action required" }, { status: 400 });
    }

    if ((action === "decline" || action === "request_resubmit") && !notes?.trim()) {
      return NextResponse.json(
        { error: "Notes are required for decline or resubmission" },
        { status: 400 }
      );
    }

    const fellowship = await prisma.fellowship.findUnique({
      where: { id: fellowshipId },
      include: {
        fellowshipDocuments: {
          where: { type: "BANK_VERIFICATION" },
          orderBy: { uploadedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!fellowship) {
      return NextResponse.json({ error: "Fellowship not found" }, { status: 404 });
    }

    const bankDoc = fellowship.fellowshipDocuments[0];
    const now = new Date();

    if (action === "approve") {
      if (bankDoc) {
        await prisma.fellowshipDocument.update({
          where: { id: bankDoc.id },
          data: {
            status: "APPROVED",
            rejectionReason: null,
            reviewedAt: now,
            reviewedBy: user.id,
          },
        });
      }

      await prisma.fellowship.update({
        where: { id: fellowshipId },
        data: {
          bankVerificationStatus: "APPROVED",
          bankVerifiedAt: now,
          currentStage:
            fellowship.currentStage === "BANK_VERIFICATION" ? "SANCTIONED" : fellowship.currentStage,
        },
      });
    } else if (action === "decline") {
      if (bankDoc) {
        await prisma.fellowshipDocument.update({
          where: { id: bankDoc.id },
          data: {
            status: "REJECTED",
            rejectionReason: notes!.trim(),
            reviewedAt: now,
            reviewedBy: user.id,
          },
        });
      }

      await prisma.fellowship.update({
        where: { id: fellowshipId },
        data: {
          bankVerificationStatus: "DECLINED",
          bankVerifiedAt: null,
        },
      });
    } else if (action === "request_resubmit") {
      if (bankDoc) {
        await prisma.fellowshipDocument.update({
          where: { id: bankDoc.id },
          data: {
            status: "RESUBMIT_REQUIRED",
            rejectionReason: notes!.trim(),
            reviewedAt: now,
            reviewedBy: user.id,
          },
        });
      }

      await prisma.fellowship.update({
        where: { id: fellowshipId },
        data: {
          bankVerificationStatus: "DECLINED",
          bankVerifiedAt: null,
        },
      });
    }

    const refreshed = await syncManualBankVerification(fellowshipId);

    return NextResponse.json({
      success: true,
      status: refreshed?.bankVerificationStatus,
      verifiedAt: refreshed?.bankVerifiedAt,
    });
  } catch (error) {
    console.error("Manual bank review error:", error);
    return NextResponse.json({ error: "Failed to update bank verification" }, { status: 500 });
  }
}
