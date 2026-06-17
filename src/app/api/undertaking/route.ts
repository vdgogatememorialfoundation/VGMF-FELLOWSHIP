import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getClientIp } from "@/lib/request-ip";
import { generateUndertakingPdf } from "@/lib/undertaking-pdf";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");

  if (applicationId) {
    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
      include: { digitalUndertaking: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({
      application: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        name: application.name,
        status: application.status,
      },
      undertaking: application.digitalUndertaking,
    });
  }

  const application = await prisma.application.findFirst({
    where: {
      userId: user.id,
      status: { in: ["DRAFT", "SUBMITTED", "SCRUTINY"] },
    },
    orderBy: { updatedAt: "desc" },
    include: { digitalUndertaking: true },
  });

  if (!application) {
    const anyApp = await prisma.application.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { digitalUndertaking: true },
    });
    return NextResponse.json({
      application: anyApp
        ? {
            id: anyApp.id,
            applicationNumber: anyApp.applicationNumber,
            name: anyApp.name,
            status: anyApp.status,
          }
        : null,
      undertaking: anyApp?.digitalUndertaking ?? null,
    });
  }

  return NextResponse.json({
    application: {
      id: application.id,
      applicationNumber: application.applicationNumber,
      name: application.name,
      status: application.status,
    },
    undertaking: application.digitalUndertaking,
  });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      applicationId,
      fullName,
      agreeFellowshipRules,
      certifyInfoCorrect,
      agreeFundUtilization,
      signatureDataUrl,
      signatureType,
    } = body;

    if (!applicationId || !fullName?.trim()) {
      return NextResponse.json({ error: "Application and full name are required" }, { status: 400 });
    }

    if (!agreeFellowshipRules || !certifyInfoCorrect || !agreeFundUtilization) {
      return NextResponse.json({ error: "All undertaking declarations must be accepted" }, { status: 400 });
    }

    if (!signatureDataUrl || !String(signatureDataUrl).startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid signature image is required" }, { status: 400 });
    }

    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
      include: { digitalUndertaking: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.digitalUndertaking) {
      return NextResponse.json(
        { error: "Digital undertaking already submitted", undertaking: application.digitalUndertaking },
        { status: 400 }
      );
    }

    const base64 = String(signatureDataUrl).replace(/^data:image\/\w+;base64,/, "");
    const signatureBuffer = Buffer.from(base64, "base64");

    const sigDir = path.join(process.cwd(), "public", "uploads", applicationId, "signatures");
    await mkdir(sigDir, { recursive: true });
    const sigFileName = `signature_${Date.now()}.png`;
    const sigFullPath = path.join(sigDir, sigFileName);
    await writeFile(sigFullPath, signatureBuffer);
    const signaturePath = `/uploads/${applicationId}/signatures/${sigFileName}`;

    const ipAddress = getClientIp(request);
    const submittedAt = new Date();

    const pdfPath = await generateUndertakingPdf({
      applicationId,
      applicationNumber: application.applicationNumber,
      fullName: fullName.trim(),
      signatureImagePath: signaturePath,
      ipAddress,
      submittedAt,
    });

    const undertaking = await prisma.digitalUndertaking.create({
      data: {
        applicationId,
        fullName: fullName.trim(),
        agreeFellowshipRules: true,
        certifyInfoCorrect: true,
        agreeFundUtilization: true,
        signaturePath,
        signatureType: signatureType === "upload" ? "UPLOADED" : "DRAWN",
        pdfPath,
        ipAddress,
        submittedAt,
      },
    });

    await prisma.application.update({
      where: { id: applicationId },
      data: { undertakingAcceptedAt: submittedAt },
    });

    return NextResponse.json({ success: true, undertaking });
  } catch (error) {
    console.error("Undertaking submit error:", error);
    return NextResponse.json({ error: "Failed to submit undertaking" }, { status: 500 });
  }
}
