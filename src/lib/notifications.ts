import prisma from "./db";
import type { NotificationChannel } from "@prisma/client";
import { sendNotificationEmail, sendApplicationConfirmationEmail } from "./email";
import { sendWhatsAppMessage } from "./whatsapp";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  channel: NotificationChannel = "BOTH"
) {
  const notification = await prisma.notification.create({
    data: { userId, title, message, channel },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (user) {
    const name = user.profile?.name ?? user.email;

    if (channel === "EMAIL" || channel === "BOTH") {
      await sendNotificationEmail(user.email, name, title, message);
    }

    if ((channel === "WHATSAPP" || channel === "BOTH") && user.phone) {
      await sendWhatsAppMessage(user.phone, `*${title}*\n\n${message}`);
    }
  }

  return notification;
}

export async function notifyApplicationSubmitted(
  userId: string,
  appNumber: string,
  applicantEmail?: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  const name = user?.profile?.name ?? user?.email ?? "Applicant";
  const email = applicantEmail || user?.email;
  const message = `Your fellowship application has been submitted successfully. Your 12-digit application number is ${appNumber}. Use this number to track your application status.`;

  await prisma.notification.create({
    data: {
      userId,
      title: "Application Submitted",
      message,
      channel: "EMAIL",
    },
  });

  if (email) {
    await sendApplicationConfirmationEmail(email, name, appNumber);
  }

  if (user?.phone) {
    await sendWhatsAppMessage(
      user.phone,
      `*VGMF Fellowship Application Submitted*\n\nYour 12-digit application number:\n*${appNumber}*\n\nSave this number to track your application status.`
    );
  }
}

export async function notifyStatusChange(
  userId: string,
  appNumber: string,
  status: string
) {
  const statusMessages: Record<string, string> = {
    UNDER_REVIEW: "Your application is now under review.",
    SHORTLISTED: "Congratulations! Your application has been shortlisted.",
    INTERVIEW_SCHEDULED: "An interview has been scheduled for your application.",
    SELECTED: "Congratulations! You have been selected for the fellowship.",
    REJECTED: "We regret to inform you that your application was not selected.",
    WAITLISTED: "Your application has been placed on the waitlist.",
  };

  await createNotification(
    userId,
    `Application Status: ${status.replace(/_/g, " ")}`,
    `Application ${appNumber}: ${statusMessages[status] ?? "Your application status has been updated."}`
  );
}

export async function notifyDocumentResubmit(
  userId: string,
  docType: string,
  reason: string
) {
  await createNotification(
    userId,
    "Document Resubmission Required",
    `Your ${docType.replace(/_/g, " ")} document requires resubmission. Reason: ${reason}`
  );
}

export async function notifyInterviewScheduled(
  userId: string,
  date: string,
  time: string,
  link: string
) {
  await createNotification(
    userId,
    "Interview Scheduled",
    `Your interview is scheduled for ${date} at ${time}. Meeting link: ${link}`
  );
}

export async function notifyInstallmentReleased(
  userId: string,
  installmentNo: number,
  amount: number
) {
  await createNotification(
    userId,
    "Installment Released",
    `Installment ${installmentNo} of ₹${amount.toLocaleString("en-IN")} has been released to your account.`
  );
}

export async function notifyReportDue(userId: string, quarter: number, year: number) {
  await createNotification(
    userId,
    "Progress Report Due",
    `Your Q${quarter} ${year} progress report is due. Please submit it at your earliest convenience.`
  );
}
