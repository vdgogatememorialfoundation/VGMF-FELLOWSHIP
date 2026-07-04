import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST - Sign the fellowship agreement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fellowshipId: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fellowshipId } = await params;

  try {
    // Find the fellowship
    const fellowship = await prisma.fellowship.findUnique({
      where: { id: fellowshipId },
      include: {
        application: { select: { userId: true, applicationNumber: true } },
      },
    });

    if (!fellowship) {
      return NextResponse.json({ error: "Fellowship not found" }, { status: 404 });
    }

    // Verify the user owns this fellowship
    if (fellowship.application.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if agreement exists
    if (!fellowship.agreementGeneratedAt) {
      return NextResponse.json({ error: "Agreement not yet generated" }, { status: 400 });
    }

    // Check if already signed
    if (fellowship.agreementSignedAt) {
      return NextResponse.json({ error: "Agreement already signed" }, { status: 400 });
    }

    // Sign the agreement
    const signedAt = new Date();
    await prisma.fellowship.update({
      where: { id: fellowshipId },
      data: {
        agreementSignedAt: signedAt,
        currentStage: "ACTIVE",
        statusHistory: {
          create: {
            fromStatus: fellowship.currentStage,
            toStatus: "ACTIVE",
            changedBy: user.id,
            notes: "Fellowship agreement signed by applicant",
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      signedAt,
      message: "Agreement signed successfully"
    });
  } catch (error) {
    console.error("Sign agreement error:", error);
    return NextResponse.json({ error: "Failed to sign agreement" }, { status: 500 });
  }
}

// GET - Check signing status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fellowshipId: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fellowshipId } = await params;

  try {
    const fellowship = await prisma.fellowship.findUnique({
      where: { id: fellowshipId },
      select: {
        agreementGeneratedAt: true,
        agreementSignedAt: true,
      },
    });

    if (!fellowship) {
      return NextResponse.json({ error: "Fellowship not found" }, { status: 404 });
    }

    return NextResponse.json({
      generated: !!fellowship.agreementGeneratedAt,
      signed: !!fellowship.agreementSignedAt,
      signedAt: fellowship.agreementSignedAt,
    });
  } catch (error) {
    console.error("Check status error:", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
