import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { formatApplicationNumber } from "@/lib/application-number";
import {
  TRACKING_PIPELINE,
  getPipelineProgress,
  getPipelineIndex,
  getDocumentLabel,
} from "@/lib/application-workflow";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: {
      statusHistory: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { uploadedAt: "asc" } },
      interview: true,
      fellowship: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    pipeline: TRACKING_PIPELINE,
    applications: applications.map((app) => ({
      id: app.id,
      applicationNumber: app.applicationNumber,
      formattedNumber: formatApplicationNumber(app.applicationNumber),
      status: app.status,
      progress: getPipelineProgress(app.status),
      pipelineIndex: getPipelineIndex(app.status),
      rejectionReason: app.rejectionReason,
      adminNotes: app.adminNotes,
      submittedAt: app.submittedAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      documents: app.documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        label: getDocumentLabel(doc.type),
        status: doc.status,
        fileName: doc.fileName,
        filePath: doc.filePath,
        rejectionReason: doc.rejectionReason,
        reviewedAt: doc.reviewedAt,
        canResubmit: doc.status === "RESUBMIT_REQUIRED",
      })),
      statusHistory: app.statusHistory.map((entry) => ({
        id: entry.id,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        notes: entry.notes,
        createdAt: entry.createdAt,
      })),
      interview: app.interview
        ? {
            scheduledDate: app.interview.scheduledDate,
            scheduledTime: app.interview.scheduledTime,
            meetingLink: app.interview.meetingLink,
            panelMembers: app.interview.panelMembers,
          }
        : null,
      fellowship: app.fellowship
        ? {
            fellowshipId: app.fellowship.fellowshipId,
            isActive: app.fellowship.isActive,
            isCompleted: app.fellowship.isCompleted,
          }
        : null,
    })),
  });
}
