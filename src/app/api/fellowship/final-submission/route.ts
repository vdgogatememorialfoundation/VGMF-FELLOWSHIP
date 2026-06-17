import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function saveFile(fellowshipId: string, prefix: string, file: File) {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "fellowships", fellowshipId);
  await mkdir(uploadDir, { recursive: true });
  const fileName = `${prefix}_${Date.now()}_${file.name}`;
  const fullPath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);
  return `/uploads/fellowships/${fellowshipId}/${fileName}`;
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

    const finalReportPath = await saveFile(fellowshipId, "final_report", finalReport);
    const manuscriptPath = manuscript ? await saveFile(fellowshipId, "manuscript", manuscript) : null;
    const utilizationCertPath = utilizationCert
      ? await saveFile(fellowshipId, "utilization_cert", utilizationCert)
      : null;

    const submission = await prisma.finalSubmission.upsert({
      where: { fellowshipId },
      update: {
        finalReportPath,
        manuscriptPath,
        utilizationCertPath,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
      create: {
        fellowshipId,
        finalReportPath,
        manuscriptPath,
        utilizationCertPath,
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("Final submission error:", error);
    return NextResponse.json({ error: "Failed to submit final report" }, { status: 500 });
  }
}
