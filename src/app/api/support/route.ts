import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { supportSchema } from "@/lib/validations";
import {
  formatTicketForClient,
  isSupportStaffRole,
  ticketInclude,
} from "@/lib/support-tickets";
import { notifySupportStaffNewTicket } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "APPLICANT") {
    return NextResponse.json({ error: "Only applicants can create support tickets" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = supportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: parsed.data.subject,
        message: parsed.data.message,
        replies: {
          create: {
            authorId: user.id,
            body: parsed.data.message,
            isStaffReply: false,
          },
        },
      },
      include: ticketInclude,
    });

    void notifySupportStaffNewTicket(ticket.id, ticket.subject, user.name || user.email);

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

  const where =
    user.role === "APPLICANT"
      ? { userId: user.id }
      : isSupportStaffRole(user.role)
        ? {}
        : null;

  if (!where) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: ticketInclude,
  });

  return NextResponse.json({
    tickets: tickets.map((ticket) =>
      formatTicketForClient(ticket, { forStaff: isSupportStaffRole(user.role) })
    ),
  });
}
