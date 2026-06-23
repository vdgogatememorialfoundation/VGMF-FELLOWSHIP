import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getIntegrationConfig } from "@/lib/integrations";
import { createAccurascanSession } from "@/lib/accurascan";
import { createIdnormSession } from "@/lib/idnorm";
import { VerificationPurpose } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { purpose, applicationId } = await req.json();

    if (!purpose) {
      return NextResponse.json({ error: "Missing purpose" }, { status: 400 });
    }

    let application = null;
    if (applicationId) {
      application = await prisma.application.findFirst({
        where: { id: applicationId, userId: user.id },
        include: { user: true, fellowship: true },
      });
      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
    }

    const integrations = await getIntegrationConfig();

    let session;
    const input = {
      purpose: purpose as VerificationPurpose,
      userId: user.id,
      applicationId: applicationId || null,
      fellowshipId: application?.fellowship?.id || null,
      customerIdentifier: user.email,
      customerName: user.name || "Applicant",
      referenceId: applicationId || user.id,
    };

    if (integrations.activeVerificationProvider === "ACCURASCAN") {
      session = await createAccurascanSession(input);
    } else {
      session = await createIdnormSession(input);
    }

    return NextResponse.json({ 
      verificationUrl: session.verificationUrl,
      recordId: session.recordId 
    });
  } catch (error: unknown) {
    console.error("Online verification session error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create verification session" },
      { status: 500 }
    );
  }
}
