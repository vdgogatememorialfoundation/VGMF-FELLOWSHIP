import type { UserRole } from "@prisma/client";

export type SupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_ON_APPLICANT"
  | "RESOLVED"
  | "CLOSED";

export const SUPPORT_STAFF_ROLES: UserRole[] = ["ADMIN", "STAFF"];

export const SUPPORT_TICKET_STATUSES: SupportTicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_APPLICANT",
  "RESOLVED",
  "CLOSED",
];

export const SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_ON_APPLICANT: "Waiting on applicant",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const SUPPORT_STATUS_COLORS: Record<SupportTicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  WAITING_ON_APPLICANT: "bg-orange-100 text-orange-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-700",
};

export function isSupportStaffRole(role: UserRole): boolean {
  return SUPPORT_STAFF_ROLES.includes(role);
}

export function getSupportStatusLabel(status: string): string {
  return SUPPORT_STATUS_LABELS[status as SupportTicketStatus] ?? status;
}

export function getSupportStatusColor(status: string): string {
  return SUPPORT_STATUS_COLORS[status as SupportTicketStatus] ?? "bg-gray-100 text-gray-800";
}

export function isTicketClosed(status: SupportTicketStatus | string): boolean {
  return status === "CLOSED" || status === "RESOLVED";
}

export const ticketInclude = {
  user: {
    select: {
      id: true,
      userId: true,
      email: true,
      profile: { select: { name: true } },
    },
  },
  assignedTo: {
    select: {
      id: true,
      userId: true,
      profile: { select: { name: true } },
    },
  },
  replies: {
    orderBy: { createdAt: "asc" as const },
    include: {
      author: {
        select: {
          id: true,
          role: true,
          profile: { select: { name: true } },
        },
      },
    },
  },
  _count: { select: { replies: true } },
};

export function formatReplyForClient(reply: {
  id: string;
  body: string;
  isStaffReply: boolean;
  createdAt: Date;
  author: { id: string; role: UserRole; profile: { name: string } | null };
}) {
  return {
    id: reply.id,
    body: reply.body,
    isStaffReply: reply.isStaffReply,
    createdAt: reply.createdAt.toISOString(),
    authorName: reply.author.profile?.name || (reply.isStaffReply ? "Support team" : "You"),
    authorRole: reply.author.role,
  };
}

export function formatTicketForClient(
  ticket: {
    id: string;
    subject: string;
    message: string;
    status: SupportTicketStatus;
    createdAt: Date;
    updatedAt: Date;
    closedAt: Date | null;
    userId: string;
    user?: {
      id: string;
      userId: string;
      email: string;
      profile: { name: string } | null;
    };
    assignedTo?: {
      id: string;
      userId: string;
      profile: { name: string } | null;
    } | null;
    replies?: Array<{
      id: string;
      body: string;
      isStaffReply: boolean;
      createdAt: Date;
      author: { id: string; role: UserRole; profile: { name: string } | null };
    }>;
    _count?: { replies: number };
  },
  options?: { forStaff?: boolean }
) {
  const replies =
    ticket.replies && ticket.replies.length > 0
      ? ticket.replies.map(formatReplyForClient)
      : [
          {
            id: "initial",
            body: ticket.message,
            isStaffReply: false,
            createdAt: ticket.createdAt.toISOString(),
            authorName: ticket.user?.profile?.name || "Applicant",
            authorRole: "APPLICANT" as UserRole,
          },
        ];

  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    statusLabel: getSupportStatusLabel(ticket.status),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    closedAt: ticket.closedAt?.toISOString() ?? null,
    replyCount: ticket._count?.replies ?? replies.length,
    replies,
    applicant: ticket.user
      ? {
          id: ticket.user.id,
          userId: ticket.user.userId,
          name: ticket.user.profile?.name || ticket.user.email,
          email: ticket.user.email,
        }
      : options?.forStaff
        ? undefined
        : undefined,
    assignedTo: ticket.assignedTo
      ? {
          id: ticket.assignedTo.id,
          userId: ticket.assignedTo.userId,
          name: ticket.assignedTo.profile?.name || ticket.assignedTo.userId,
        }
      : null,
  };
}
