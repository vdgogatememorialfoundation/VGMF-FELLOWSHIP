import prisma from "./db";

type ReminderTier = "30_DAYS" | "15_DAYS" | "DUE_TODAY" | "OVERDUE";

export async function processFellowshipReminders() {
  const now = new Date();
  const reminders = await prisma.fellowshipReminder.findMany({
    where: { overdueEscalated: false },
    include: {
      fellowship: {
        include: {
          application: { include: { user: true } },
          progressReports: true,
        },
      },
    },
  });

  const sent: string[] = [];

  for (const reminder of reminders) {
    const hasReport = reminder.fellowship.progressReports.some(
      (r) => r.quarter === reminder.quarter && r.year === reminder.year
    );
    if (hasReport) continue;

    const due = reminder.dueDate;
    const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let tier: ReminderTier | null = null;

    if (daysUntil < 0 && !reminder.overdueEscalated) tier = "OVERDUE";
    else if (daysUntil === 0 && !reminder.reminderDueSent) tier = "DUE_TODAY";
    else if (daysUntil <= 15 && daysUntil > 0 && !reminder.reminder15Sent) tier = "15_DAYS";
    else if (daysUntil <= 30 && daysUntil > 15 && !reminder.reminder30Sent) tier = "30_DAYS";

    if (!tier) continue;

    const userId = reminder.fellowship.application.userId;
    const title =
      tier === "OVERDUE"
        ? "Overdue: Quarterly progress report"
        : tier === "DUE_TODAY"
          ? "Urgent: Quarterly report due today"
          : `Reminder: Quarterly report due in ${daysUntil} days`;

    await prisma.notification.create({
      data: {
        userId,
        title,
        message: `Please submit Q${reminder.quarter} ${reminder.year} progress report for fellowship ${reminder.fellowship.fellowshipId}.`,
        channel: "BOTH",
      },
    });

    const update: Record<string, boolean> = {};
    if (tier === "30_DAYS") update.reminder30Sent = true;
    if (tier === "15_DAYS") update.reminder15Sent = true;
    if (tier === "DUE_TODAY") update.reminderDueSent = true;
    if (tier === "OVERDUE") update.overdueEscalated = true;

    await prisma.fellowshipReminder.update({
      where: { id: reminder.id },
      data: update,
    });

    sent.push(`${reminder.fellowship.fellowshipId} Q${reminder.quarter}: ${tier}`);
  }

  return { processed: sent.length, details: sent };
}

export async function ensureQuarterlyReminder(
  fellowshipId: string,
  quarter: number,
  year: number
) {
  const dueDate = new Date(year, quarter * 3 - 1, 15);
  await prisma.fellowshipReminder.upsert({
    where: {
      fellowshipId_quarter_year: { fellowshipId, quarter, year },
    },
    update: {},
    create: { fellowshipId, quarter, year, dueDate },
  });
}
