import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getClientIp } from "@/lib/request-ip";
import { generateUndertakingPdf } from "@/lib/undertaking-pdf";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIGNATURE_BYTES = 5 * 1024 * 1024;

function parseBoolean(value: FormDataEntryValue | boolean | null | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  return value === "true" || value === "1" || value === "on";
}

async function readSignatureBuffer(
  request: NextRequest
): Promise<
  | { ok: true; body: Record<string, unknown>; signatureBuffer: Buffer }
  | { ok: false; error: string; status: number }
> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const applicationId = String(formData.get("applicationId") || "");
    const fullName = String(formData.get("fullName") || "");
    const agreeFellowshipRules = parseBoolean(formData.get("agreeFellowshipRules"));
    const certifyInfoCorrect = parseBoolean(formData.get("certifyInfoCorrect"));
    const agreeFundUtilization = parseBoolean(formData.get("agreeFundUtilization"));
    const signatureType = String(formData.get("signatureType") || "draw");
    const signatureFile = formData.get("signature");

    if (!applicationId || !fullName.trim()) {
      return { ok: false, error: "Application and full name are required", status: 400 };
    }

    if (!agreeFellowshipRules || !certifyInfoCorrect || !agreeFundUtilization) {
      return { ok: false, error: "All undertaking declarations must be accepted", status: 400 };
    }

    if (!(signatureFile instanceof File) || signatureFile.size === 0) {
      return { ok: false, error: "A valid signature image is required", status: 400 };
    }

    if (signatureFile.size > MAX_SIGNATURE_BYTES) {
      return { ok: false, error: "Signature image must be 5 MB or smaller", status: 400 };
    }

    const signatureBuffer = Buffer.from(await signatureFile.arrayBuffer());
    return {
      ok: true,
      signatureBuffer,
      body: {
        applicationId,
        fullName,
        agreeFellowshipRules,
        certifyInfoCorrect,
        agreeFundUtilization,
        signatureType,
      },
    };
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "Invalid request body", status: 400 };
  }

  const {
    applicationId,
    fullName,
    agreeFellowshipRules,
    certifyInfoCorrect,
    agreeFundUtilization,
    signatureDataUrl,
    signatureType,
  } = body;

  if (!applicationId || !String(fullName || "").trim()) {
    return { ok: false, error: "Application and full name are required", status: 400 };
  }

  if (!agreeFellowshipRules || !certifyInfoCorrect || !agreeFundUtilization) {
    return { ok: false, error: "All undertaking declarations must be accepted", status: 400 };
  }

  if (!signatureDataUrl || !String(signatureDataUrl).startsWith("data:image/")) {
    return { ok: false, error: "A valid signature image is required", status: 400 };
  }

  const base64 = String(signatureDataUrl).replace(/^data:image\/\w+;base64,/, "");
  const signatureBuffer = Buffer.from(base64, "base64");

  if (signatureBuffer.length === 0) {
    return { ok: false, error: "Signature image could not be processed", status: 400 };
  }

  if (signatureBuffer.length > MAX_SIGNATURE_BYTES) {
    return { ok: false, error: "Signature image must be 5 MB or smaller", status: 400 };
  }

  return {
    ok: true,
    signatureBuffer,
    body: {
      applicationId,
      fullName,
      agreeFellowshipRules,
      certifyInfoCorrect,
      agreeFundUtilization,
      signatureType,
    },
  };
}

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
    const parsed = await readSignatureBuffer(request);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const {
      applicationId,
      fullName,
      signatureType,
    } = parsed.body as {
      applicationId: string;
      fullName: string;
      signatureType?: string;
    };
    const signatureBuffer = parsed.signatureBuffer;

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
    const message =
      error instanceof Error ? error.message : "Failed to submit undertaking";
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      {
        error: isDev ? message : "Failed to submit undertaking. Please try a smaller signature image or draw your signature instead.",
        detail: isDev && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
