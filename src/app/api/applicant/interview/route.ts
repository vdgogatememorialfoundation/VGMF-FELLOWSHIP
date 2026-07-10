import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getIntegrationConfig } from "@/lib/integrations";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the latest application with interview for this user
    const application = await prisma.application.findFirst({
      where: {
        userId: user.id,
        status: "INTERVIEW_SCHEDULED",
      },
      include: {
        interview: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!application || !application.interview) {
      return NextResponse.json({ error: "No scheduled interview found" }, { status: 404 });
    }

    const interview = application.interview;
    const config = await getIntegrationConfig();

    // Calculate access times
    const scheduledDateTime = new Date(interview.scheduledDate);
    const [hours, minutes] = interview.scheduledTime.split(":").map(Number);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    const accessTime = new Date(scheduledDateTime);
    accessTime.setMinutes(accessTime.getMinutes() - config.interviewSettings.linkAccessMinutes);

    const now = new Date();
    const minutesUntilAccess = Math.max(0, Math.ceil((accessTime.getTime() - now.getTime()) / (1000 * 60)));
    const isAccessible = minutesUntilAccess <= 0;

    // Calculate time until meeting starts
    const minutesUntilMeeting = Math.max(0, Math.ceil((scheduledDateTime.getTime() - now.getTime()) / (1000 * 60)));

    return NextResponse.json({
      interview: {
        id: interview.id,
        applicationId: interview.applicationId,
        applicationNumber: application.applicationNumber,
        interviewType: interview.interviewType,
        scheduledDate: interview.scheduledDate.toISOString().split("T")[0],
        scheduledTime: interview.scheduledTime,
        durationMinutes: interview.durationMinutes,
        meetingLink: interview.meetingLink,
        location: interview.location,
        address: interview.address,
        googleMapsUrl: interview.googleMapsUrl,
        panelMembers: interview.panelMembers,
        status: interview.status,
        notes: interview.notes,
      },
      accessInfo: {
        isAccessible,
        minutesUntilAccess,
        minutesUntilMeeting,
        accessTime: accessTime.toISOString(),
        meetingStartTime: scheduledDateTime.toISOString(),
        linkAccessMinutes: config.interviewSettings.linkAccessMinutes,
      },
    });
  } catch (error) {
    console.error("Error fetching applicant interview:", error);
    return NextResponse.json({ error: "Failed to fetch interview" }, { status: 500 });
  }
}
