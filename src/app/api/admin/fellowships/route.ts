import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const fellowshipId = formData.get("fellowshipId") as string;
      const file = formData.get("file") as File;

      if (!fellowshipId || !file) {
        return NextResponse.json({ error: "Fellowship ID and file required" }, { status: 400 });
      }

      const fellowship = await prisma.fellowship.findUnique({ where: { id: fellowshipId } });
      if (!fellowship) {
        return NextResponse.json({ error: "Fellowship not found" }, { status: 404 });
      }

      const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "fellowships",
        fellowshipId,
        "inst1"
      );
      await mkdir(uploadDir, { recursive: true });
      const fileName = `ACCEPTANCE_LETTER_${Date.now()}_${file.name}`;
      const fullPath = path.join(uploadDir, fileName);
      await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));
      const relativePath = `/uploads/fellowships/${fellowshipId}/inst1/${fileName}`;

      const document = await prisma.fellowshipDocument.upsert({
        where: {
          fellowshipId_installmentNo_type: {
            fellowshipId,
            installmentNo: 1,
            type: "ACCEPTANCE_LETTER",
          },
        },
        update: {
          fileName: file.name,
          filePath: relativePath,
          fileSize: file.size,
          mimeType: file.type,
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedBy: user.id,
        },
        create: {
          fellowshipId,
          installmentNo: 1,
          type: "ACCEPTANCE_LETTER",
          fileName: file.name,
          filePath: relativePath,
          fileSize: file.size,
          mimeType: file.type,
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedBy: user.id,
        },
      });

      await prisma.fellowship.update({
        where: { id: fellowshipId },
        data: { awardLetterPath: relativePath },
      });

      return NextResponse.json({ success: true, document });
    }

    return NextResponse.json({ error: "Use multipart form for file upload" }, { status: 400 });
  } catch (error) {
    console.error("Fellowship admin upload error:", error);
    return NextResponse.json({ error: "Failed to upload" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fellowshipId, action, progressScore, remarks } = await request.json();

    if (!fellowshipId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fellowship = await prisma.fellowship.findUnique({
      where: { id: fellowshipId },
      include: { finalSubmission: true },
    });

    if (!fellowship) {
      return NextResponse.json({ error: "Fellowship not found" }, { status: 404 });
    }

    if (action === "mid_term_approve") {
      const review = await prisma.midTermReview.create({
        data: {
          fellowshipId,
          reviewerId: user.id,
          progressScore: Number(progressScore) || 0,
          remarks: remarks || null,
          nextInstallmentApproved: true,
        },
      });

      await prisma.fundInstallment.updateMany({
        where: { fellowshipId, installmentNo: 2, status: "PENDING" },
        data: { status: "APPROVED" },
      });

      return NextResponse.json({ success: true, review });
    }

    if (action === "final_approve") {
      if (!fellowship.finalSubmission) {
        return NextResponse.json({ error: "No final submission on record" }, { status: 400 });
      }

      await prisma.finalSubmission.update({
        where: { fellowshipId },
        data: { status: "APPROVED", reviewedAt: new Date() },
      });

      await prisma.fundInstallment.updateMany({
        where: { fellowshipId, installmentNo: 3, status: "PENDING" },
        data: { status: "APPROVED" },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Fellowship admin error:", error);
    return NextResponse.json({ error: "Failed to update fellowship" }, { status: 500 });
  }
}
