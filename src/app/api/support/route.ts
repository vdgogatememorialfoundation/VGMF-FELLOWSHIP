import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { supportSchema } from "@/lib/validations";
import {
  formatTicketForClient,
  isSupportStaffRole,
  ticketInclude,
} from "@/lib/support-tickets";
import { notifySupportStaffNewTicket, notifySupportTicketUpdate } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isStaff = isSupportStaffRole(user.role);
  if (!isStaff && user.role !== "APPLICANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = supportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    let targetUserId = user.id;
    if (isStaff) {
      const { userId } = body;
      if (!userId || typeof userId !== "string") {
        return NextResponse.json({ error: "Applicant userId is required" }, { status: 400 });
      }
      const targetUser = await prisma.user.findFirst({
        where: { id: userId, role: "APPLICANT" },
      });
      if (!targetUser) {
        return NextResponse.json({ error: "Applicant not found" }, { status: 400 });
      }
      targetUserId = targetUser.id;
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: targetUserId,
        subject: parsed.data.subject,
        message: parsed.data.message,
        replies: {
          create: {
            authorId: user.id,
            body: parsed.data.message,
            isStaffReply: isStaff,
          },
        },
      },
      include: ticketInclude,
    });

    if (isStaff) {
      void notifySupportTicketUpdate(
        targetUserId,
        ticket.id,
        ticket.subject,
        "An administrator opened a support ticket on your behalf. Open Support in your portal to view the details."
      );
    } else {
      void notifySupportStaffNewTicket(ticket.id, ticket.subject, user.name || user.email);
    }

    return NextResponse.json({ success: true, ticket: formatTicketForClient(ticket) });
  } catch (error) {
    console.error("Support ticket error:", error);
    return NextResponse.json({ error: "Failed to create support ticket" }, { status: 500 });
  }
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isStaff = isSupportStaffRole(user.role);
  const where =
    user.role === "APPLICANT"
      ? { userId: user.id }
      : isStaff
        ? {}
        : null;

  if (!where) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [tickets, applicants] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: ticketInclude,
    }),
    isStaff
      ? prisma.user.findMany({
          where: { role: "APPLICANT", isActive: true },
          select: {
            id: true,
            email: true,
            profile: { select: { name: true } },
          },
          orderBy: { email: "asc" },
        }).then((rows) =>
          rows.map((r) => ({
            id: r.id,
            name: r.profile?.name || "",
            email: r.email,
          }))
        )
      : Promise.resolve(undefined),
  ]);

  return NextResponse.json({
    tickets: tickets.map((ticket) =>
      formatTicketForClient(ticket, { forStaff: isStaff })
    ),
    applicants,
  });
}
