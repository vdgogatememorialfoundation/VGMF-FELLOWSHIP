import prisma from "./db";
import type { NotificationChannel } from "@prisma/client";
import {
  sendNotificationEmail,
  sendApplicationConfirmationEmail,
  sendWelcomeEmail,
  sendApplicationStatusEmail,
} from "./email";
import { sendWhatsAppFellowshipAlert } from "./whatsapp";
import { getIntegrationConfig } from "./integrations";
import type { NotificationEventKey } from "./notification-templates";
import { getAccessControl } from "./access-control";
import { getStatusLabel } from "./utils";
import {
  buildStatusEmailContent,
  shouldSendMainStatusEmail,
} from "./status-email";
import {
  buildApplicationSubmittedWhatsAppMessage,
  buildFellowshipAlertWhatsAppMessage,
  buildWelcomeWhatsAppMessage,
} from "./whatsapp-fellowship-content";

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
    const config = await getIntegrationConfig();
    const whatsappMessage = buildFellowshipAlertWhatsAppMessage({
      name,
      title,
      message,
      portalUrl: config.appUrl,
    });
    await sendWhatsAppFellowshipAlert(user.phone, whatsappMessage, {
      event: "PORTAL_ALERT",
    });
  }
}

export async function dispatchStatusUpdate(
  userId: string,
  title: string,
  message: string,
  options?: {
    applicationStatus?: string;
    whatsappEvent?: NotificationEventKey;
    email?: boolean;
    whatsapp?: boolean;
    applicationNumber?: string;
    useDetailedStatusEmail?: boolean;
  }
) {
  const access = await getAccessControl();
  const sendEmail = options?.email ?? true;
  const sendWhatsapp = options?.whatsapp ?? true;

  await prisma.notification.create({
    data: { userId, title, message, channel: "BOTH" },
  });

  const user = await getUserContact(userId);
  if (!user) return;

  const name = user.profile?.name ?? user.email;

  if (sendEmail && access.statusNotifyEmailEnabled) {
    if (
      options?.useDetailedStatusEmail &&
      options.applicationNumber &&
      options.applicationStatus
    ) {
      const emailContent = buildStatusEmailContent(
        options.applicationStatus,
        options.applicationNumber
      );
      await sendApplicationStatusEmail(
        user.email,
        name,
        options.applicationNumber,
        emailContent
      );
    } else {
      await sendNotificationEmail(user.email, name, title, message);
    }
  }

  if (sendWhatsapp && access.statusNotifyWhatsappEnabled && user.phone) {
    const config = await getIntegrationConfig();
    const whatsappMessage = buildFellowshipAlertWhatsAppMessage({
      name,
      title,
      message,
      applicationNumber: options?.applicationNumber,
      statusLabel: options?.applicationStatus
        ? getStatusLabel(options.applicationStatus)
        : null,
      portalUrl: config.appUrl,
    });
    await sendWhatsAppFellowshipAlert(user.phone, whatsappMessage, {
      event: options?.whatsappEvent ?? "STATUS_UPDATE",
    });
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
  const config = await getIntegrationConfig();

  if (access.welcomeEmailEnabled) {
    await sendWelcomeEmail(email, name, userUserId);
  }

  if (access.welcomeWhatsappEnabled && user?.phone) {
    const whatsappMessage = buildWelcomeWhatsAppMessage({
      name,
      userId: userUserId,
      portalUrl: config.appUrl,
    });
    await sendWhatsAppFellowshipAlert(user.phone, whatsappMessage, {
      event: "ACCOUNT_CREATED",
    });
  }
}

export async function notifyApplicationSubmitted(
  userId: string,
  appNumber: string,
  applicantEmail?: string
) {
  const access = await getAccessControl();
  const user = await getUserContact(userId);
  const config = await getIntegrationConfig();

  const application = await prisma.application.findFirst({
    where: { userId, applicationNumber: appNumber },
    include: {
      researchProposal: { select: { projectTitle: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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
    const whatsappMessage = buildApplicationSubmittedWhatsAppMessage({
      name,
      applicationNumber: appNumber,
      userId: user.userId,
      email,
      projectTitle: application?.researchProposal?.projectTitle,
      portalUrl: config.appUrl,
    });
    await sendWhatsAppFellowshipAlert(user.phone, whatsappMessage, {
      event: "APPLICATION_SUBMITTED",
    });
  }
}

const STATUS_MESSAGES: Record<string, string> = {
  DRAFT: "Your application has been saved as a draft. You can continue editing before final submission.",
  SUBMITTED: "Your application has been submitted and is awaiting review.",
  SCRUTINY: "Your application is under administrative scrutiny. Documents and details are being verified.",
  SCRUTINY_APPROVED: "Scrutiny completed successfully. Your application will proceed to committee review.",
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
  const sendExternal = shouldSendMainStatusEmail(options?.fromStatus, status);

  await dispatchStatusUpdate(
    userId,
    `Application Status: ${label}`,
    `Application ${appNumber}: ${detail}`,
    {
      applicationStatus: status,
      whatsappEvent: "STATUS_UPDATE",
      email: sendExternal,
      whatsapp: sendExternal,
      applicationNumber: appNumber,
      useDetailedStatusEmail: sendExternal,
    }
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
    `Your ${docType.replace(/_/g, " ")} document requires resubmission. Reason: ${reason}`,
    { whatsappEvent: "DOCUMENT_REVIEW", email: false, whatsapp: false }
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
        : status === "REJECTED"
          ? `Your ${docType.replace(/_/g, " ")} document was rejected.${reason ? ` Reason: ${reason}` : ""} Please re-upload a corrected file.`
          : `Your ${docType.replace(/_/g, " ")} document status is now ${label}.${reason ? ` Note: ${reason}` : ""}`;

  await dispatchStatusUpdate(userId, `Document Update: ${label}`, message, {
    whatsappEvent: "DOCUMENT_REVIEW",
    email: false,
    whatsapp: false,
  });
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
    `Your fellowship interview is scheduled for ${date} at ${time}. Meeting link: ${link}`,
    { whatsappEvent: "INTERVIEW_SCHEDULED" }
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
    `Installment ${installmentNo} of ₹${amount.toLocaleString("en-IN")} has been released to your account.`,
    { whatsappEvent: "INSTALLMENT_RELEASED" }
  );
}

export async function notifyReportDue(userId: string, quarter: number, year: number) {
  await dispatchStatusUpdate(
    userId,
    "Progress Report Due",
    `Your Q${quarter} ${year} progress report is due. Please submit it at your earliest convenience.`,
    { whatsappEvent: "PROGRESS_REPORT_DUE" }
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
  await dispatchStatusUpdate(userId, `Portal Notice: ${title}`, content, {
    whatsappEvent: "SITE_NOTICE",
  });
}
