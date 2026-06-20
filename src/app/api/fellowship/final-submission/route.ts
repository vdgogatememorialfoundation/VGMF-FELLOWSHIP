import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { persistUpload } from "@/lib/upload-files";

async function saveFile(fellowshipId: string, prefix: string, file: File) {
  const fileName = `${prefix}_${Date.now()}_${file.name}`;
  const storedPath = `/uploads/fellowships/${fellowshipId}/${fileName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { fileData } = await persistUpload(storedPath, buffer, file.type);
  return {
    path: storedPath,
    data: fileData,
  };
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const fellowshipId = formData.get("fellowshipId") as string;
    const finalReport = formData.get("finalReport") as File | null;
    const manuscript = formData.get("manuscript") as File | null;
    const utilizationCert = formData.get("utilizationCert") as File | null;

    if (!fellowshipId || !finalReport) {
      return NextResponse.json({ error: "Fellowship ID and final report are required" }, { status: 400 });
    }

    const fellowship = await prisma.fellowship.findFirst({
      where: {
        id: fellowshipId,
        application: { userId: user.id, status: { in: ["SELECTED", "AGREEMENT_PENDING", "COMPLETED"] } },
      },
    });

    if (!fellowship) {
      return NextResponse.json({ error: "Fellowship not found" }, { status: 404 });
    }

    const finalReportFile = await saveFile(fellowshipId, "final_report", finalReport);
    const manuscriptFile = manuscript ? await saveFile(fellowshipId, "manuscript", manuscript) : null;
    const utilizationCertFile = utilizationCert
      ? await saveFile(fellowshipId, "utilization_cert", utilizationCert)
      : null;

    const submission = await prisma.finalSubmission.upsert({
      where: { fellowshipId },
      update: {
        finalReportPath: finalReportFile.path,
        finalReportData: finalReportFile.data,
        manuscriptPath: manuscriptFile?.path ?? null,
        manuscriptData: manuscriptFile?.data ?? null,
        utilizationCertPath: utilizationCertFile?.path ?? null,
        utilizationCertData: utilizationCertFile?.data ?? null,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
      create: {
        fellowshipId,
        finalReportPath: finalReportFile.path,
        finalReportData: finalReportFile.data,
        manuscriptPath: manuscriptFile?.path ?? null,
        manuscriptData: manuscriptFile?.data ?? null,
        utilizationCertPath: utilizationCertFile?.path ?? null,
        utilizationCertData: utilizationCertFile?.data ?? null,
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("Final submission error:", error);
    return NextResponse.json({ error: "Failed to submit final report" }, { status: 500 });
  }
}
