import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { formatAccountForAdmin } from "@/lib/admin-users";

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Get the account with all related data
  const account = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      applications: {
        orderBy: { createdAt: "desc" },
      },
      sentMessages: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      receivedMessages: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      supportTickets: {
        orderBy: { createdAt: "desc" },
      },
      assignedSupportTickets: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      sessions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      generatedOTPs: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      emailLogs: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      formSubmissions: {
        orderBy: { createdAt: "desc" },
      },
      queriesRaised: {
        orderBy: { createdAt: "desc" },
      },
      verificationSessions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      // Fellowship related data
      fellowships: {
        include: {
          fellowship: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Get first login (first session)
  const firstLogin = await prisma.session.findFirst({
    where: { userId: id },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  // Get activation date (first time isActive became true)
  // For simplicity, we'll use the createdAt or the first session as activation date
  // In production, you might want to track this explicitly

  return NextResponse.json({
    account: {
      ...formatAccountForAdmin(account),
      firstLoginAt: firstLogin?.createdAt || null,
      activationDate: firstLogin?.createdAt || account.createdAt,
      // Activity counts
      activityCounts: {
        applications: account.applications.length,
        formSubmissions: account.formSubmissions.length,
        supportTickets: account.supportTickets.length,
        assignedTickets: account.assignedSupportTickets.length,
        queries: account.queriesRaised.length,
        notifications: account.notifications.length,
        sentMessages: account.sentMessages.length,
        receivedMessages: account.receivedMessages.length,
        sessions: account.sessions.length,
        otps: account.generatedOTPs.length,
        emailLogs: account.emailLogs.length,
        auditLogs: account.auditLogs.length,
      },
      // Detailed data
      applications: account.applications,
      formSubmissions: account.formSubmissions,
      supportTickets: account.supportTickets,
      assignedTickets: account.assignedSupportTickets,
      queries: account.queriesRaised,
      notifications: account.notifications,
      sentMessages: account.sentMessages,
      receivedMessages: account.receivedMessages,
      sessions: account.sessions,
      otps: account.generatedOTPs,
      emailLogs: account.emailLogs,
      auditLogs: account.auditLogs,
      verificationSessions: account.verificationSessions,
      fellowships: account.fellowships,
    },
  });
}
