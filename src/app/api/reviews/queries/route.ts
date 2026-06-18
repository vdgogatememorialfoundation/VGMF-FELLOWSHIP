import { NextRequest, NextResponse } from "next/server";
import type { ReviewPhase } from "@prisma/client";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  canRaiseQuery,
  raiseApplicationQuery,
  respondToApplicationQuery,
  resolveApplicationQuery,
} from "@/lib/review-workflow";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applicationId = request.nextUrl.searchParams.get("applicationId");
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { userId: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const isApplicant = application.userId === user.id;
  const isStaff = ["ADMIN", "STAFF", "COMMITTEE", "TRUSTEE"].includes(user.role);

  if (!isApplicant && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const queries = await prisma.applicationQuery.findMany({
    where: { applicationId },
    include: {
      raisedByUser: { include: { profile: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ queries });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "raise") {
      const { applicationId, phase, message, requiresFullResubmit } = body as {
        applicationId: string;
        phase: ReviewPhase;
        message: string;
        requiresFullResubmit?: boolean;
      };

      if (!applicationId || !phase || !message?.trim()) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      if (!canRaiseQuery(user.role, phase)) {
        return NextResponse.json({ error: "You cannot raise queries for this phase" }, { status: 403 });
      }

      if (user.role !== "ADMIN" && user.role !== "STAFF") {
        const assigned = await prisma.applicationReviewAssignment.findFirst({
          where: {
            applicationId,
            reviewerId: user.id,
            phase,
            isActive: true,
          },
        });
        if (!assigned) {
          return NextResponse.json(
            { error: "This application is not assigned to you for review" },
            { status: 403 }
          );
        }
      }

      const query = await raiseApplicationQuery({
        applicationId,
        raisedBy: user.id,
        phase,
        message: message.trim(),
        requiresFullResubmit,
      });

      return NextResponse.json({ success: true, query });
    }

    if (action === "respond") {
      const { queryId, response } = body as { queryId: string; response: string };
      if (!queryId || !response?.trim()) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const query = await respondToApplicationQuery({
        queryId,
        userId: user.id,
        response: response.trim(),
      });

      return NextResponse.json({ success: true, query });
    }

    if (action === "resolve") {
      if (!["ADMIN", "STAFF", "COMMITTEE", "TRUSTEE"].includes(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { queryId, resumeStatus } = body as { queryId: string; resumeStatus?: string };
      if (!queryId) {
        return NextResponse.json({ error: "queryId required" }, { status: 400 });
      }

      await resolveApplicationQuery({
        queryId,
        resolvedBy: user.id,
        resumeStatus,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process query";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
