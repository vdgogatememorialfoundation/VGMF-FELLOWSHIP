import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getIntegrationConfig } from "@/lib/integrations";
import {
  notifyInterviewScheduled,
  notifyInterviewRescheduled,
  notifyInterviewCancelled,
  notifyStatusChange,
} from "@/lib/notifications";
import {
  createMiroTalkRoom,
  deleteMiroTalkRoom,
  generateMeetingRoomId,
  getMiroTalkJoinUrl,
} from "@/lib/mirotalk";

// GET - List all interviews or get single interview
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "COADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const applicationId = searchParams.get("applicationId");

    if (applicationId) {
      const interview = await prisma.interview.findUnique({
        where: { applicationId },
        include: {
          application: {
            select: {
              id: true,
              applicationNumber: true,
              name: true,
              email: true,
              mobile: true,
              status: true,
              user: {
                select: {
                  id: true,
                  profile: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      if (!interview) {
        return NextResponse.json({ error: "Interview not found" }, { status: 404 });
      }

      return NextResponse.json({ interview });
    }

    // Get all scheduled interviews
    const interviews = await prisma.interview.findMany({
      where: {
        status: { in: ["SCHEDULED", "RESCHEDULED"] },
      },
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            name: true,
            email: true,
            status: true,
            user: {
              select: {
                profile: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
    });

    return NextResponse.json({ interviews });
  } catch (error) {
    console.error("Interview fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch interviews" }, { status: 500 });
  }
}

// PATCH - Update interview (complete, no_show, cancel, reschedule)
export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "COADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { applicationId, action, feedback, cancellationReason, scheduledDate, scheduledTime } = body;

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

    const interview = application.interview;

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

      // Delete MiroTalk room if exists
      if (interview.mirotalkRoom) {
        await deleteMiroTalkRoom(interview.mirotalkRoom);
      }

      return NextResponse.json({ success: true });
    }

    if (action === "no_show") {
      await prisma.interview.update({
        where: { applicationId },
        data: { status: "NO_SHOW" },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "cancel") {
      const previousDate = interview.scheduledDate.toISOString().split("T")[0];
      const previousTime = interview.scheduledTime;

      await prisma.interview.update({
        where: { applicationId },
        data: {
          status: "CANCELLED",
          cancellationReason: cancellationReason || null,
        },
      });

      // Delete MiroTalk room if exists
      if (interview.mirotalkRoom) {
        await deleteMiroTalkRoom(interview.mirotalkRoom);
      }

      // Revert application status
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: "SHORTLISTED",
          statusHistory: {
            create: {
              fromStatus: "INTERVIEW_SCHEDULED",
              toStatus: "SHORTLISTED",
              changedBy: user.id,
              notes: "Interview cancelled" + (cancellationReason ? `: ${cancellationReason}` : ""),
            },
          },
        },
      });

      // Notify applicant
      await notifyInterviewCancelled(
        application.userId,
        application.applicationNumber,
        previousDate,
        previousTime,
        cancellationReason
      );

      return NextResponse.json({ success: true });
    }

    if (action === "reschedule") {
      if (!scheduledDate || !scheduledTime) {
        return NextResponse.json(
          { error: "scheduledDate and scheduledTime required for reschedule" },
          { status: 400 }
        );
      }

      const previousDate = interview.scheduledDate.toISOString().split("T")[0];
      const previousTime = interview.scheduledTime;
      const config = await getIntegrationConfig();

      // If online interview, create new MiroTalk room
      let newMirotalkRoom = interview.mirotalkRoom;
      let newMeetingLink = interview.meetingLink;

      if (interview.interviewType === "ONLINE") {
        // Delete old room
        if (interview.mirotalkRoom) {
          await deleteMiroTalkRoom(interview.mirotalkRoom);
        }

        // Create new room
        const roomId = generateMeetingRoomId(applicationId);
        const roomResult = await createMiroTalkRoom({
          room: roomId,
          attendee: "interview",
          duration: interview.durationMinutes + 15,
        });

        if (!roomResult.success) {
          return NextResponse.json(
            { error: "Failed to create meeting room" },
            { status: 500 }
          );
        }

        newMirotalkRoom = roomResult.room!.room;
        newMeetingLink = getMiroTalkJoinUrl(roomResult.room!.room, "VGMF Interview", {
          mirotalkUrl: config.mirotalk.url || undefined,
        });
      }

      await prisma.interview.update({
        where: { applicationId },
        data: {
          previousScheduledDate: interview.scheduledDate,
          previousScheduledTime: interview.scheduledTime,
          scheduledDate: new Date(scheduledDate),
          scheduledTime: String(scheduledTime),
          status: "RESCHEDULED",
          meetingLink: newMeetingLink,
          mirotalkRoom: newMirotalkRoom,
        },
      });

      // Notify applicant
      const newDateStr = new Date(scheduledDate).toISOString().split("T")[0];
      await notifyInterviewRescheduled(
        application.userId,
        application.applicationNumber,
        previousDate,
        previousTime,
        newDateStr,
        String(scheduledTime),
        interview.interviewType,
        {
          meetingLink: newMeetingLink,
          location: interview.location || undefined,
          address: interview.address || undefined,
          durationMinutes: interview.durationMinutes,
          linkAccessMinutes: config.interviewSettings.linkAccessMinutes,
        }
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Interview update error:", error);
    return NextResponse.json({ error: "Failed to update interview" }, { status: 500 });
  }
}

// POST - Create new interview
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "COADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      applicationId,
      interviewType,
      scheduledDate,
      scheduledTime,
      durationMinutes,
      location,
      address,
      googleMapsUrl,
      panelMembers,
      notes,
    } = body;

    // Validation
    if (!applicationId || !scheduledDate || !scheduledTime || !panelMembers) {
      return NextResponse.json({ error: "Missing required interview fields" }, { status: 400 });
    }

    if (interviewType === "IN_PERSON" && !location) {
      return NextResponse.json({ error: "Location is required for in-person interviews" }, { status: 400 });
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

    // Check if interview already exists
    const existingInterview = await prisma.interview.findUnique({
      where: { applicationId },
    });

    if (existingInterview && existingInterview.status === "SCHEDULED") {
      return NextResponse.json(
        { error: "An interview is already scheduled. Please reschedule or cancel the existing one first." },
        { status: 400 }
      );
    }

    const config = await getIntegrationConfig();
    let meetingLink: string | null = null;
    let mirotalkRoom: string | null = null;

    // Create MiroTalk room for online interviews
    if (interviewType === "ONLINE" || !interviewType) {
      const roomId = generateMeetingRoomId(applicationId);
      const duration = durationMinutes || 30;
      
      const roomResult = await createMiroTalkRoom({
        room: roomId,
        attendee: "interview",
        duration: duration + 15, // Add buffer time
      });

      if (!roomResult.success) {
        // If MiroTalk fails, still allow creating interview but without link
        console.error("Failed to create MiroTalk room:", roomResult.error);
      } else {
        mirotalkRoom = roomResult.room!.room;
        meetingLink = getMiroTalkJoinUrl(roomResult.room!.room, "VGMF Interview", {
          mirotalkUrl: config.mirotalk.url || undefined,
        });
      }
    }

    const interview = await prisma.interview.upsert({
      where: { applicationId },
      update: {
        interviewType: interviewType || "ONLINE",
        scheduledDate: new Date(scheduledDate),
        scheduledTime: String(scheduledTime),
        durationMinutes: durationMinutes || 30,
        meetingLink,
        mirotalkRoom,
        location: interviewType === "IN_PERSON" ? location : null,
        address: interviewType === "IN_PERSON" ? address : null,
        googleMapsUrl: interviewType === "IN_PERSON" ? googleMapsUrl : null,
        panelMembers: String(panelMembers),
        notes: notes || null,
        status: "SCHEDULED",
        previousScheduledDate: null,
        previousScheduledTime: null,
        cancellationReason: null,
        applicantNotifiedAt: new Date(),
      },
      create: {
        applicationId,
        interviewType: interviewType || "ONLINE",
        scheduledDate: new Date(scheduledDate),
        scheduledTime: String(scheduledTime),
        durationMinutes: durationMinutes || 30,
        meetingLink,
        mirotalkRoom,
        location: interviewType === "IN_PERSON" ? location : null,
        address: interviewType === "IN_PERSON" ? address : null,
        googleMapsUrl: interviewType === "IN_PERSON" ? googleMapsUrl : null,
        panelMembers: String(panelMembers),
        notes: notes || null,
        applicantNotifiedAt: new Date(),
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
    }

    // Notify applicant
    const scheduledDateStr = new Date(scheduledDate).toISOString().split("T")[0];
    await notifyInterviewScheduled(
      application.userId,
      application.applicationNumber,
      scheduledDateStr,
      String(scheduledTime),
      interviewType || "ONLINE",
      {
        meetingLink,
        location,
        address,
        durationMinutes: durationMinutes || 30,
        linkAccessMinutes: config.interviewSettings.linkAccessMinutes,
      }
    );

    return NextResponse.json({ success: true, interview });
  } catch (error) {
    console.error("Interview schedule error:", error);
    return NextResponse.json({ error: "Failed to schedule interview" }, { status: 500 });
  }
}

// DELETE - Delete interview
export async function DELETE(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "COADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    const interview = await prisma.interview.findUnique({
      where: { applicationId },
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Delete MiroTalk room if exists
    if (interview.mirotalkRoom) {
      await deleteMiroTalkRoom(interview.mirotalkRoom);
    }

    // Delete interview
    await prisma.interview.delete({
      where: { applicationId },
    });

    // Revert application status
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: "SHORTLISTED",
        statusHistory: {
          create: {
            fromStatus: "INTERVIEW_SCHEDULED",
            toStatus: "SHORTLISTED",
            changedBy: user.id,
            notes: "Interview deleted",
          },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Interview delete error:", error);
    return NextResponse.json({ error: "Failed to delete interview" }, { status: 500 });
  }
}
