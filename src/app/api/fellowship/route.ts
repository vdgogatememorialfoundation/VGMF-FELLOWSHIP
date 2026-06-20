import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { encodeFileData, writeUploadToDisk } from "@/lib/upload-files";
import { ensureApplicantFellowship } from "@/lib/fellowship-access";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { application, fellowship } = await ensureApplicantFellowship(user.id);

  if (!fellowship || !application) {
    return NextResponse.json({
      fellowship: null,
      message:
        "No active fellowship yet. This section opens after trustee approval and fellowship award.",
    });
  }

  return NextResponse.json({
    fellowship,
    applicationNumber: application.applicationNumber,
    applicationStatus: application.status,
  });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const fellowshipId = formData.get("fellowshipId") as string;
    const quarter = Number(formData.get("quarter"));
    const year = Number(formData.get("year"));
    const reportFile = formData.get("report") as File | null;

    if (!fellowshipId || !quarter || !year || !reportFile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    const uploadDir = path.join(process.cwd(), "public", "uploads", "fellowships", fellowshipId);
    await mkdir(uploadDir, { recursive: true });

    const fileName = `Q${quarter}_${year}_${Date.now()}_${reportFile.name}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await reportFile.arrayBuffer());
    await writeFile(filePath, buffer);

    const reportPath = `/uploads/fellowships/${fellowshipId}/${fileName}`;
    const reportData = encodeFileData(buffer);
    await writeUploadToDisk(reportPath, buffer);

    const report = await prisma.progressReport.upsert({
      where: {
        fellowshipId_quarter_year: { fellowshipId, quarter, year },
      },
      update: {
        reportPath,
        reportData,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
      create: {
        fellowshipId,
        quarter,
        year,
        reportPath,
        reportData,
      },
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Progress report error:", error);
    return NextResponse.json({ error: "Failed to submit progress report" }, { status: 500 });
  }
}
