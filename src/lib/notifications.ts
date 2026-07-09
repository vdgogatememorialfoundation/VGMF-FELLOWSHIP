import prisma from "./db";
import type { NotificationChannel } from "@prisma/client";
import {
  sendNotificationEmail,
  sendApplicationConfirmationEmail,
  sendWelcomeEmail,
  sendApplicationStatusEmail,
} from "./email";
import { sendWhatsAppForEvent } from "./whatsapp";
import {
  resolveStatusWhatsAppTemplateName,
  type NotificationEventKey,
} from "./notification-templates";
import { getAccessControl } from "./access-control";
import { getStatusLabel } from "./utils";
import {
  buildStatusEmailContent,
  shouldSendMainStatusEmail,
} from "./status-email";

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
    await sendWhatsAppForEvent("PORTAL_ALERT", user.phone, [], {
      staticTemplate: true,
      forceDelivery: true,
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
    const whatsappEvent = options?.whatsappEvent ?? "STATUS_UPDATE";
    const templateName =
      whatsappEvent === "STATUS_UPDATE"
        ? resolveStatusWhatsAppTemplateName(options?.applicationStatus)
        : undefined;

    await sendWhatsAppForEvent(whatsappEvent, user.phone, [], {
      templateName,
      staticTemplate: true,
      forceDelivery: true,
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
  userUserId: string,
  password?: string
) {
  const access = await getAccessControl();
  const user = await getUserContact(userId);

  if (access.welcomeEmailEnabled) {
    await sendWelcomeEmail(email, name, userUserId, password);
  }

  if (access.welcomeWhatsappEnabled && user?.phone) {
    await sendWhatsAppForEvent("ACCOUNT_CREATED", user.phone, [], {
      staticTemplate: true,
      forceDelivery: true,
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
    await sendWhatsAppForEvent("APPLICATION_SUBMITTED", user.phone, [], {
      staticTemplate: true,
      forceDelivery: true,
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
  const docLabel = docType.replace(/_/g, " ");
  
  let message: string;
  const sendEmail = true;
  
  if (status === "APPROVED") {
    message = `Your ${docLabel} document has been approved.`;
  } else if (status === "RESUBMIT_REQUIRED") {
    message = `Your ${docLabel} document requires resubmission.${reason ? ` Reason: ${reason}` : ""}`;
  } else if (status === "REJECTED") {
    message = `Your ${docLabel} document was rejected.${reason ? ` Reason: ${reason}` : ""} Please re-upload a corrected file.`;
  } else {
    message = `Your ${docLabel} document status is now ${label}.${reason ? ` Note: ${reason}` : ""}`;
  }

  await dispatchStatusUpdate(userId, `Document Update: ${label}`, message, {
    whatsappEvent: "DOCUMENT_REVIEW",
    email: sendEmail,
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

export async function notifyFellowshipAgreementReady(
  userId: string,
  fellowshipId: string,
  applicationNumber: string
) {
  await dispatchNotification(
    userId,
    "Fellowship Agreement Ready for Signing",
    `Your fellowship agreement (ID: ${fellowshipId}) for application ${applicationNumber} is ready. Please log in to the fellowship portal to review and digitally sign the agreement.`,
    { channel: "EMAIL", emailTemplate: "agreement_ready" }
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
  ticketId: string,
  subject: string,
  updateMessage: string
) {
  const shortId = ticketId.slice(-8).toUpperCase();
  await dispatchNotification(
    userId,
    `Support Ticket #${shortId}: ${subject}`,
    `${updateMessage} (Ticket ID: ${ticketId})`,
    { channel: "BOTH" }
  );
}

export async function notifySupportStaffNewTicket(
  ticketId: string,
  subject: string,
  applicantLabel: string,
  isReply = false
) {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF", "COADMIN"] }, isActive: true },
    select: { id: true },
  });

  const shortId = ticketId.slice(-8).toUpperCase();
  const title = isReply ? `Support ticket reply #${shortId}: ${subject}` : `New support ticket #${shortId}: ${subject}`;
  const message = isReply
    ? `${applicantLabel} replied on ticket "${subject}" (ID: ${ticketId}). Open Support Tickets in the admin or staff portal.`
    : `${applicantLabel} opened a new support ticket: "${subject}" (ID: ${ticketId}).`;

  await Promise.allSettled(
    staff.map((member) =>
      prisma.notification.create({
        data: {
          userId: member.id,
          title,
          message,
          channel: "EMAIL",
        },
      })
    )
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
