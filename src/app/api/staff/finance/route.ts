import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { releaseInstallment } from "@/lib/fellowship-service";

import { validateInstallmentRelease } from "@/lib/installment-gates";

export async function GET() {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "COADMIN", "FINANCE"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const installments = await prisma.fundInstallment.findMany({
    include: {
      fellowship: {
        include: {
          application: {
            include: { digitalUndertaking: { select: { pdfPath: true } } },
          },
          fellowshipDocuments: true,
          progressReports: true,
          finalSubmission: true,
        },
      },
    },
    orderBy: [{ fellowship: { createdAt: "desc" } }, { installmentNo: "asc" }],
  });

  const enriched = await Promise.all(
    installments.map(async (inst) => {
      const gate = await validateInstallmentRelease(
        inst.fellowshipId,
        inst.installmentNo
      );
      return { ...inst, releaseGate: gate };
    })
  );

  const financeRecords = await prisma.financeRecord.findMany({
    include: { fellowship: true },
  });

  return NextResponse.json({ installments: enriched, financeRecords });
}

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "COADMIN", "FINANCE"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { installmentId, action, transactionId, approvalNotes } = await request.json();

    if (!installmentId || action !== "release") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const updated = await releaseInstallment({
      installmentId,
      transactionId,
      approvalNotes,
      reviewerId: user.id,
    });

    return NextResponse.json({ success: true, installment: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to release installment";
    console.error("Finance release error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
