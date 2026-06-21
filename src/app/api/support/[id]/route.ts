import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { SupportTicketStatus } from "@/lib/support-tickets";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { supportReplySchema } from "@/lib/validations";
import {
  formatTicketForClient,
  isSupportStaffRole,
  isTicketClosed,
  ticketInclude,
} from "@/lib/support-tickets";
import { notifySupportTicketUpdate, notifySupportStaffNewTicket } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function loadTicket(id: string) {
  return prisma.supportTicket.findUnique({
    where: { id },
    include: ticketInclude,
  });
}

function canAccessTicket(
  ticket: { userId: string },
  user: { id: string; role: string }
) {
  if (ticket.userId === user.id) return true;
  return isSupportStaffRole(user.role as "ADMIN" | "STAFF");
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const ticket = await loadTicket(id);
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  if (!canAccessTicket(ticket, user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ticket: formatTicketForClient(ticket, { forStaff: isSupportStaffRole(user.role) }),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const ticket = await loadTicket(id);
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  if (!canAccessTicket(ticket, user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isStaff = isSupportStaffRole(user.role);
  if (!isStaff && ticket.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isTicketClosed(ticket.status) && !isStaff) {
    return NextResponse.json({ error: "This ticket is closed" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = supportReplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const nextStatus = (
      isStaff
        ? "WAITING_ON_APPLICANT"
        : ticket.status === "WAITING_ON_APPLICANT" || ticket.status === "OPEN"
          ? "IN_PROGRESS"
          : ticket.status
    ) as SupportTicketStatus;

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: isTicketClosed(ticket.status) && isStaff ? "IN_PROGRESS" : nextStatus,
        closedAt: isTicketClosed(ticket.status) && isStaff ? null : ticket.closedAt,
        assignedToId: isStaff ? user.id : ticket.assignedToId,
        replies: {
          create: {
            authorId: user.id,
            body: parsed.data.body,
            isStaffReply: isStaff,
          },
        },
      },
      include: ticketInclude,
    });

    if (isStaff) {
      void notifySupportTicketUpdate(
        ticket.userId,
        ticket.subject,
        "Our support team replied to your ticket. Open Support in your applicant portal to read the message."
      );
    } else {
      void notifySupportStaffNewTicket(
        ticket.id,
        ticket.subject,
        ticket.user.profile?.name || ticket.user.email,
        true
      );
    }

    return NextResponse.json({ ticket: formatTicketForClient(updated, { forStaff: isStaff }) });
  } catch (error) {
    console.error("Support reply error:", error);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getSession();
  if (!user || !isSupportStaffRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const ticket = await loadTicket(id);
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  try {
    const body = await request.json();
    const status = body.status as SupportTicketStatus | undefined;
    const assignedToId =
      body.assignedToId === null ? null : (body.assignedToId as string | undefined);

    const data: Prisma.SupportTicketUncheckedUpdateInput = {};

    if (status) {
      data.status = status;
      data.closedAt = status === "CLOSED" || status === "RESOLVED" ? new Date() : null;
    }
    if (assignedToId !== undefined) {
      data.assignedToId = assignedToId;
    }

    const updated = await prisma.supportTicket.update({
      where: { id },
      data,
      include: ticketInclude,
    });

    if (status && ticket.userId) {
      void notifySupportTicketUpdate(
        ticket.userId,
        ticket.subject,
        `Your support ticket status was updated to: ${status.replace(/_/g, " ").toLowerCase()}.`
      );
    }

    return NextResponse.json({ ticket: formatTicketForClient(updated, { forStaff: true }) });
  } catch (error) {
    console.error("Support ticket update error:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
