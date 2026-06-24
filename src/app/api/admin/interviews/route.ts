import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notifyStatusChange } from "@/lib/notifications";

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "COADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { applicationId, action, feedback } = await request.json();

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { interview: true },
    });

    if (!application?.interview) {
      return NextResponse.json({ error: "No interview scheduled" }, { status: 404 });
    }

    if (action === "complete") {
      await prisma.interview.update({
        where: { applicationId },
        data: { status: "COMPLETED", feedback: feedback || null },
      });

      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: "INTERVIEW_COMPLETED",
          statusHistory: {
            create: {
              fromStatus: application.status,
              toStatus: "INTERVIEW_COMPLETED",
              changedBy: user.id,
              notes: feedback || "Interview marked completed",
            },
          },
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "no_show") {
      await prisma.interview.update({
        where: { applicationId },
        data: { status: "NO_SHOW" },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Interview update error:", error);
    return NextResponse.json({ error: "Failed to update interview" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "COADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { applicationId, scheduledDate, scheduledTime, meetingLink, panelMembers, notes } =
      body;

    if (!applicationId || !scheduledDate || !scheduledTime || !meetingLink || !panelMembers) {
      return NextResponse.json({ error: "Missing required interview fields" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (!["SHORTLISTED", "WAITLISTED", "UNDER_REVIEW"].includes(application.status)) {
      return NextResponse.json(
        { error: "Interview can only be scheduled for shortlisted or under-review applications" },
        { status: 400 }
      );
    }

    const interview = await prisma.interview.upsert({
      where: { applicationId },
      update: {
        scheduledDate: new Date(scheduledDate),
        scheduledTime: String(scheduledTime),
        meetingLink: String(meetingLink),
        panelMembers: String(panelMembers),
        notes: notes || null,
      },
      create: {
        applicationId,
        scheduledDate: new Date(scheduledDate),
        scheduledTime: String(scheduledTime),
        meetingLink: String(meetingLink),
        panelMembers: String(panelMembers),
        notes: notes || null,
      },
    });

    if (application.status !== "INTERVIEW_SCHEDULED") {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: "INTERVIEW_SCHEDULED",
          statusHistory: {
            create: {
              fromStatus: application.status,
              toStatus: "INTERVIEW_SCHEDULED",
              changedBy: user.id,
              notes: `Interview scheduled for ${scheduledDate} at ${scheduledTime}`,
            },
          },
        },
      });

      await notifyStatusChange(
        application.userId,
        application.applicationNumber,
        "INTERVIEW_SCHEDULED",
        { fromStatus: application.status }
      );
    }

    return NextResponse.json({ success: true, interview });
  } catch (error) {
    console.error("Interview schedule error:", error);
    return NextResponse.json({ error: "Failed to schedule interview" }, { status: 500 });
  }
}
