import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  isDigioIdentityAvailable,
  MANUAL_IDENTITY_DOCUMENT_TYPES,
  getManualIdentityDocumentLabel,
  syncManualIdentityVerification,
} from "@/lib/manual-verification";
import { toUploadApiUrl } from "@/lib/upload-files";

async function loadApplicationForUser(applicationId: string, userId: string, isStaff: boolean) {
  return prisma.application.findFirst({
    where: {
      id: applicationId,
      ...(isStaff ? {} : { userId }),
    },
    include: {
      documents: {
        where: {
          type: { in: [...MANUAL_IDENTITY_DOCUMENT_TYPES] },
        },
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applicationId = request.nextUrl.searchParams.get("applicationId");
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  }

  const isStaff = ["ADMIN", "STAFF"].includes(user.role);
  const application = await loadApplicationForUser(applicationId, user.id, isStaff);

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const digioAvailable = await isDigioIdentityAvailable();

  return NextResponse.json({
    mode: digioAvailable ? "digio" : "manual",
    digioAvailable,
    status: application.identityVerificationStatus,
    verifiedAt: application.identityVerifiedAt,
    verificationNotes: application.verificationNotes,
    documents: MANUAL_IDENTITY_DOCUMENT_TYPES.map((type) => {
      const doc = application.documents.find((item) => item.type === type);
      return {
        type,
        label: getManualIdentityDocumentLabel(type),
        uploaded: Boolean(doc),
        status: doc?.status ?? null,
        fileName: doc?.fileName ?? null,
        filePath: toUploadApiUrl(doc?.filePath, { documentId: doc?.id }) ?? doc?.filePath ?? null,
        rejectionReason: doc?.rejectionReason ?? null,
        documentId: doc?.id ?? null,
      };
    }),
    canSubmit:
      !digioAvailable &&
      MANUAL_IDENTITY_DOCUMENT_TYPES.every((type) =>
        application.documents.some((doc) => doc.type === type)
      ) &&
      !["APPROVED", "IN_REVIEW"].includes(application.identityVerificationStatus),
  });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (await isDigioIdentityAvailable()) {
    return NextResponse.json(
      { error: "Online Digio verification is active. Use the Digio panel instead." },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as { applicationId?: string; action?: string };
    const { applicationId, action } = body;

    if (!applicationId || action !== "submit") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const application = await loadApplicationForUser(applicationId, user.id, false);
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const missing = MANUAL_IDENTITY_DOCUMENT_TYPES.filter(
      (type) => !application.documents.some((doc) => doc.type === type)
    );

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Upload ${missing.map(getManualIdentityDocumentLabel).join(" and ")} before submitting.`,
        },
        { status: 400 }
      );
    }

    if (application.documents.some((doc) => doc.status === "RESUBMIT_REQUIRED")) {
      return NextResponse.json(
        { error: "Replace the documents marked for resubmission before submitting again." },
        { status: 400 }
      );
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        identityVerificationStatus: "IN_REVIEW",
        verificationNotes: null,
      },
    });

    return NextResponse.json({
      success: true,
      status: updated.identityVerificationStatus,
    });
  } catch (error) {
    console.error("Manual identity submit error:", error);
    return NextResponse.json({ error: "Failed to submit identity verification" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      applicationId?: string;
      action?: "approve" | "decline" | "request_resubmit";
      notes?: string;
    };

    const { applicationId, action, notes } = body;

    if (!applicationId || !action) {
      return NextResponse.json({ error: "applicationId and action required" }, { status: 400 });
    }

    if ((action === "decline" || action === "request_resubmit") && !notes?.trim()) {
      return NextResponse.json({ error: "Notes are required for decline or resubmission" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        documents: {
          where: { type: { in: [...MANUAL_IDENTITY_DOCUMENT_TYPES] } },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const now = new Date();

    if (action === "approve") {
      await prisma.$transaction(async (tx) => {
        for (const doc of application.documents) {
          await tx.applicationDocument.update({
            where: { id: doc.id },
            data: {
              status: "APPROVED",
              rejectionReason: null,
              reviewedAt: now,
              reviewedBy: user.id,
            },
          });
        }

        await tx.application.update({
          where: { id: applicationId },
          data: {
            identityVerificationStatus: "APPROVED",
            identityVerifiedAt: now,
            verificationNotes: notes?.trim() || null,
          },
        });
      });
    } else if (action === "decline") {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          identityVerificationStatus: "DECLINED",
          identityVerifiedAt: null,
          verificationNotes: notes!.trim(),
        },
      });
    } else if (action === "request_resubmit") {
      await prisma.$transaction(async (tx) => {
        for (const doc of application.documents) {
          await tx.applicationDocument.update({
            where: { id: doc.id },
            data: {
              status: "RESUBMIT_REQUIRED",
              rejectionReason: notes!.trim(),
              reviewedAt: now,
              reviewedBy: user.id,
            },
          });
        }

        await tx.application.update({
          where: { id: applicationId },
          data: {
            identityVerificationStatus: "DECLINED",
            identityVerifiedAt: null,
            verificationNotes: notes!.trim(),
          },
        });
      });
    }

    const refreshed = await syncManualIdentityVerification(applicationId);

    return NextResponse.json({
      success: true,
      status: refreshed?.identityVerificationStatus,
      verifiedAt: refreshed?.identityVerifiedAt,
    });
  } catch (error) {
    console.error("Manual identity review error:", error);
    return NextResponse.json({ error: "Failed to update identity verification" }, { status: 500 });
  }
}
