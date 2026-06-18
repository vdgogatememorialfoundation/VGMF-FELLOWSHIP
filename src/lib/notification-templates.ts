import type { Prisma } from "@prisma/client";

export type NotificationChannelOption = "EMAIL" | "WHATSAPP" | "BOTH" | "NONE";

export type NotificationEventKey =
  | "ACCOUNT_CREATED"
  | "OTP_VERIFICATION"
  | "EMAIL_VERIFICATION"
  | "APPLICATION_SUBMITTED"
  | "STATUS_UPDATE"
  | "DOCUMENT_REVIEW"
  | "INTERVIEW_SCHEDULED"
  | "INSTALLMENT_RELEASED"
  | "PROGRESS_REPORT_DUE"
  | "SUPPORT_TICKET"
  | "SITE_NOTICE"
  | "PORTAL_ALERT";

export type NotificationEventTemplate = {
  event: NotificationEventKey;
  label: string;
  description: string;
  channel: NotificationChannelOption;
  whatsappTemplateName: string;
  whatsappTemplateLanguage: string;
  emailSubject: string;
};

export type NotificationValidationIssue = {
  level: "error" | "warning";
  event?: NotificationEventKey;
  message: string;
};

export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationEventTemplate[] = [
  {
    event: "ACCOUNT_CREATED",
    label: "Account created / welcome",
    description: "Sent when a new applicant account is registered.",
    channel: "BOTH",
    whatsappTemplateName: "vgmf_account_created",
    whatsappTemplateLanguage: "en",
    emailSubject: "Welcome to {{portal_title}}",
  },
  {
    event: "OTP_VERIFICATION",
    label: "OTP verification (WhatsApp signup)",
    description: "WhatsApp OTP during applicant registration.",
    channel: "WHATSAPP",
    whatsappTemplateName: "vgmf_otp_auth",
    whatsappTemplateLanguage: "en",
    emailSubject: "",
  },
  {
    event: "EMAIL_VERIFICATION",
    label: "Email OTP verification",
    description: "Email OTP during applicant registration.",
    channel: "EMAIL",
    whatsappTemplateName: "",
    whatsappTemplateLanguage: "en",
    emailSubject: "Verify your email — {{portal_title}}",
  },
  {
    event: "APPLICATION_SUBMITTED",
    label: "Application submitted",
    description: "Confirmation with 12-digit application tracking number.",
    channel: "BOTH",
    whatsappTemplateName: "vgmf_application_submitted",
    whatsappTemplateLanguage: "en",
    emailSubject: "Application submitted — {{application_number}}",
  },
  {
    event: "STATUS_UPDATE",
    label: "Application status update",
    description: "When admin changes application workflow status.",
    channel: "BOTH",
    whatsappTemplateName: "vgmf_status_update",
    whatsappTemplateLanguage: "en",
    emailSubject: "Application status: {{status_label}}",
  },
  {
    event: "DOCUMENT_REVIEW",
    label: "Document review result",
    description: "When a document is approved, rejected, or needs resubmission.",
    channel: "BOTH",
    whatsappTemplateName: "vgmf_document_review",
    whatsappTemplateLanguage: "en",
    emailSubject: "Document update: {{document_label}}",
  },
  {
    event: "INTERVIEW_SCHEDULED",
    label: "Interview scheduled",
    description: "Interview date, time, and meeting link.",
    channel: "BOTH",
    whatsappTemplateName: "vgmf_interview_scheduled",
    whatsappTemplateLanguage: "en",
    emailSubject: "Interview scheduled — VGMF Fellowship",
  },
  {
    event: "INSTALLMENT_RELEASED",
    label: "Fellowship installment released",
    description: "When a fellowship grant installment is released.",
    channel: "BOTH",
    whatsappTemplateName: "vgmf_installment_released",
    whatsappTemplateLanguage: "en",
    emailSubject: "Installment {{installment_no}} released",
  },
  {
    event: "PROGRESS_REPORT_DUE",
    label: "Progress report due",
    description: "Quarterly fellowship progress report reminders.",
    channel: "BOTH",
    whatsappTemplateName: "vgmf_report_due",
    whatsappTemplateLanguage: "en",
    emailSubject: "Progress report due — Q{{quarter}} {{year}}",
  },
  {
    event: "SUPPORT_TICKET",
    label: "Support ticket update",
    description: "Applicant support ticket replies and updates.",
    channel: "BOTH",
    whatsappTemplateName: "vgmf_support_update",
    whatsappTemplateLanguage: "en",
    emailSubject: "Support update: {{ticket_subject}}",
  },
  {
    event: "SITE_NOTICE",
    label: "Official site notice broadcast",
    description: "When admin publishes a notice to all applicants.",
    channel: "BOTH",
    whatsappTemplateName: "vgmf_site_notice",
    whatsappTemplateLanguage: "en",
    emailSubject: "Portal notice: {{notice_title}}",
  },
  {
    event: "PORTAL_ALERT",
    label: "General portal alert",
    description: "Other in-portal alerts and admin messages.",
    channel: "BOTH",
    whatsappTemplateName: "vgmf_portal_alert",
    whatsappTemplateLanguage: "en",
    emailSubject: "{{alert_title}}",
  },
];

function isNotificationEventKey(value: string): value is NotificationEventKey {
  return DEFAULT_NOTIFICATION_TEMPLATES.some((item) => item.event === value);
}

export function mergeNotificationTemplates(
  stored: unknown,
  defaults: NotificationEventTemplate[] = DEFAULT_NOTIFICATION_TEMPLATES
): NotificationEventTemplate[] {
  const map = new Map<NotificationEventKey, Partial<NotificationEventTemplate>>();

  if (Array.isArray(stored)) {
    for (const item of stored) {
      if (!item || typeof item !== "object") continue;
      const event = (item as NotificationEventTemplate).event;
      if (typeof event === "string" && isNotificationEventKey(event)) {
        map.set(event, item as Partial<NotificationEventTemplate>);
      }
    }
  }

  return defaults.map((base) => {
    const override = map.get(base.event);
    if (!override) return base;
    return {
      ...base,
      channel: override.channel ?? base.channel,
      whatsappTemplateName: override.whatsappTemplateName ?? base.whatsappTemplateName,
      whatsappTemplateLanguage:
        override.whatsappTemplateLanguage ?? base.whatsappTemplateLanguage,
      emailSubject: override.emailSubject ?? base.emailSubject,
    };
  });
}

export function serializeNotificationTemplates(
  templates: NotificationEventTemplate[]
): Prisma.InputJsonValue {
  return templates.map((item) => ({
    event: item.event,
    channel: item.channel,
    whatsappTemplateName: item.whatsappTemplateName,
    whatsappTemplateLanguage: item.whatsappTemplateLanguage,
    emailSubject: item.emailSubject,
  }));
}

export function getNotificationTemplate(
  templates: NotificationEventTemplate[],
  event: NotificationEventKey
): NotificationEventTemplate {
  return templates.find((item) => item.event === event) ?? DEFAULT_NOTIFICATION_TEMPLATES[0];
}

export function validateNotificationSetup(input: {
  emailConfigured: boolean;
  whatsappConfigured: boolean;
  templates: NotificationEventTemplate[];
  whatsappWebhookVerifyToken?: string | null;
  emailOtpSubject?: string | null;
}): NotificationValidationIssue[] {
  const issues: NotificationValidationIssue[] = [];

  if (!input.emailConfigured) {
    issues.push({
      level: "warning",
      message: "ZeptoMail email is not configured — email alerts and OTP will fail.",
    });
  }

  if (!input.whatsappConfigured) {
    issues.push({
      level: "warning",
      message: "Meta WhatsApp is not configured — WhatsApp alerts and OTP will fail.",
    });
  }

  if (!input.emailOtpSubject?.trim()) {
    issues.push({
      level: "warning",
      event: "EMAIL_VERIFICATION",
      message: "Email OTP subject is empty — a default subject will be used.",
    });
  }

  if (!input.whatsappWebhookVerifyToken?.trim()) {
    issues.push({
      level: "warning",
      message: "WhatsApp webhook verify token is not set — Meta webhook subscription cannot be verified.",
    });
  }

  for (const template of input.templates) {
    if (template.channel === "NONE") continue;

    const needsEmail = template.channel === "EMAIL" || template.channel === "BOTH";
    const needsWhatsapp = template.channel === "WHATSAPP" || template.channel === "BOTH";

    if (needsEmail && !input.emailConfigured) {
      issues.push({
        level: "error",
        event: template.event,
        message: `${template.label} uses email but ZeptoMail is not configured.`,
      });
    }

    if (needsWhatsapp && !input.whatsappConfigured) {
      issues.push({
        level: "error",
        event: template.event,
        message: `${template.label} uses WhatsApp but Meta WhatsApp is not configured.`,
      });
    }

    if (needsWhatsapp && !template.whatsappTemplateName.trim()) {
      issues.push({
        level: "error",
        event: template.event,
        message: `${template.label} requires a Meta WhatsApp template name.`,
      });
    }

    if (needsEmail && !template.emailSubject.trim() && template.event !== "OTP_VERIFICATION") {
      issues.push({
        level: "warning",
        event: template.event,
        message: `${template.label} has no email subject configured.`,
      });
    }
  }

  return issues;
}
