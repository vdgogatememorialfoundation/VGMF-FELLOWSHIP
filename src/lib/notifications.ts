import prisma from "./db";
import type { NotificationChannel } from "@prisma/client";
import {
  sendNotificationEmail,
  sendApplicationConfirmationEmail,
  sendWelcomeEmail,
} from "./email";
import { sendWhatsAppMessage } from "./whatsapp";
import { getAccessControl } from "./access-control";
import { getStatusLabel } from "./utils";

async function getUserContact(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
}

export async function dispatchNotification(
  userId: string,
  title: string,
  message: string,
  options: {
    channel?: NotificationChannel;
    email?: boolean;
    whatsapp?: boolean;
  } = {}
) {
  const access = await getAccessControl();
  const channel = options.channel ?? "BOTH";
  const sendEmail =
    options.email ??
    ((channel === "EMAIL" || channel === "BOTH") && access.alertsEmailEnabled);
  const sendWhatsapp =
    options.whatsapp ??
    ((channel === "WHATSAPP" || channel === "BOTH") && access.alertsWhatsappEnabled);

  await prisma.notification.create({
    data: { userId, title, message, channel },
  });

  const user = await getUserContact(userId);
  if (!user) return;

  const name = user.profile?.name ?? user.email;

  if (sendEmail) {
    await sendNotificationEmail(user.email, name, title, message);
  }

  if (sendWhatsapp && user.phone) {
    await sendWhatsAppMessage(user.phone, `*${title}*\n\n${message}`);
  }
}

export async function dispatchStatusUpdate(
  userId: string,
  title: string,
  message: string
) {
  const access = await getAccessControl();

  await prisma.notification.create({
    data: { userId, title, message, channel: "BOTH" },
  });

  const user = await getUserContact(userId);
  if (!user) return;

  const name = user.profile?.name ?? user.email;

  if (access.statusNotifyEmailEnabled) {
    await sendNotificationEmail(user.email, name, title, message);
  }

  if (access.statusNotifyWhatsappEnabled && user.phone) {
    await sendWhatsAppMessage(user.phone, `*${title}*\n\n${message}`);
  }
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  channel: NotificationChannel = "BOTH"
) {
  return dispatchNotification(userId, title, message, { channel });
}

export async function sendWelcomeNotifications(
  userId: string,
  email: string,
  name: string,
  userUserId: string
) {
  const access = await getAccessControl();
  const user = await getUserContact(userId);

  if (access.welcomeEmailEnabled) {
    await sendWelcomeEmail(email, name, userUserId);
  }

  if (access.welcomeWhatsappEnabled && user?.phone) {
    await sendWhatsAppMessage(
      user.phone,
      `*Welcome to VGMF Fellowship Portal*\n\nDear ${name}, your account is ready.\nYour User ID: *${userUserId}*\n\nLog in to complete your fellowship application.`
    );
  }
}

export async function notifyApplicationSubmitted(
  userId: string,
  appNumber: string,
  applicantEmail?: string
) {
  const access = await getAccessControl();
  const user = await getUserContact(userId);

  const name = user?.profile?.name ?? user?.email ?? "Applicant";
  const email = applicantEmail || user?.email;
  const message = `Your fellowship application has been submitted successfully. Your 12-digit application number is ${appNumber}. Use this number to track your application status.`;

  await prisma.notification.create({
    data: {
      userId,
      title: "Application Submitted",
      message,
      channel: "BOTH",
    },
  });

  if (email && access.applicationNotifyEmailEnabled) {
    await sendApplicationConfirmationEmail(email, name, appNumber);
  }

  if (user?.phone && access.applicationNotifyWhatsappEnabled) {
    await sendWhatsAppMessage(
      user.phone,
      `*VGMF Fellowship Application Submitted*\n\nYour 12-digit application number:\n*${appNumber}*\n\nSave this number to track your application status.`
    );
  }
}

const STATUS_MESSAGES: Record<string, string> = {
  DRAFT: "Your application has been saved as a draft. You can continue editing before final submission.",
  SUBMITTED: "Your application has been submitted and is awaiting review.",
  UNDER_REVIEW: "Your application is now under review by the committee.",
  SHORTLISTED: "Congratulations! Your application has been shortlisted.",
  INTERVIEW_SCHEDULED: "An interview has been scheduled for your application.",
  SELECTED: "Congratulations! You have been selected for the fellowship.",
  REJECTED: "We regret to inform you that your application was not selected at this stage.",
  WAITLISTED: "Your application has been placed on the waitlist.",
};

export async function notifyStatusChange(
  userId: string,
  appNumber: string,
  status: string,
  options?: { fromStatus?: string; skipDuplicateCheck?: boolean }
) {
  if (!options?.skipDuplicateCheck && options?.fromStatus === status) {
    return;
  }

  const label = getStatusLabel(status);
  const detail =
    STATUS_MESSAGES[status] ?? `Your application status has been updated to ${label}.`;

  await dispatchStatusUpdate(
    userId,
    `Application Status: ${label}`,
    `Application ${appNumber}: ${detail}`
  );
}

export async function notifyDocumentResubmit(
  userId: string,
  docType: string,
  reason: string
) {
  await dispatchStatusUpdate(
    userId,
    "Document Resubmission Required",
    `Your ${docType.replace(/_/g, " ")} document requires resubmission. Reason: ${reason}`
  );
}

export async function notifyDocumentReviewed(
  userId: string,
  docType: string,
  status: string,
  reason?: string
) {
  const label = status.replace(/_/g, " ");
  const message =
    status === "APPROVED"
      ? `Your ${docType.replace(/_/g, " ")} document has been approved.`
      : status === "RESUBMIT_REQUIRED"
        ? `Your ${docType.replace(/_/g, " ")} document requires resubmission.${reason ? ` Reason: ${reason}` : ""}`
        : `Your ${docType.replace(/_/g, " ")} document status is now ${label}.${reason ? ` Note: ${reason}` : ""}`;

  await dispatchStatusUpdate(userId, `Document Update: ${label}`, message);
}

export async function notifyInterviewScheduled(
  userId: string,
  date: string,
  time: string,
  link: string
) {
  await dispatchStatusUpdate(
    userId,
    "Interview Scheduled",
    `Your fellowship interview is scheduled for ${date} at ${time}. Meeting link: ${link}`
  );
}

export async function notifyInstallmentReleased(
  userId: string,
  installmentNo: number,
  amount: number
) {
  await dispatchStatusUpdate(
    userId,
    "Installment Released",
    `Installment ${installmentNo} of ₹${amount.toLocaleString("en-IN")} has been released to your account.`
  );
}

export async function notifyReportDue(userId: string, quarter: number, year: number) {
  await dispatchStatusUpdate(
    userId,
    "Progress Report Due",
    `Your Q${quarter} ${year} progress report is due. Please submit it at your earliest convenience.`
  );
}

export async function notifySupportTicketUpdate(
  userId: string,
  subject: string,
  updateMessage: string
) {
  await dispatchNotification(
    userId,
    `Support Ticket: ${subject}`,
    updateMessage,
    { channel: "BOTH" }
  );
}

export async function notifySiteNotice(
  userId: string,
  title: string,
  content: string
) {
  await dispatchStatusUpdate(userId, `Portal Notice: ${title}`, content);
}
