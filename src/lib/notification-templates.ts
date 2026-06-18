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
  /** Meta utility templates with fixed text — send without body parameters */
  whatsappStaticTemplate?: boolean;
};

export type NotificationValidationIssue = {
  level: "error" | "warning";
  event?: NotificationEventKey;
  message: string;
};

export const CRITICAL_WHATSAPP_EVENTS: NotificationEventKey[] = ["OTP_VERIFICATION"];

export const DEFAULT_WHATSAPP_OTP_TEMPLATE_NAME = "vgmf_otp_auth";

/** Utility / marketing templates — must never be used for OTP sends. */
export const WHATSAPP_UTILITY_TEMPLATE_NAMES = new Set([
  "vgmf_account_created",
  "vgmf_account_created1",
  "vgmf_registration_success",
  "vgmf_under_review",
  "vgmf_application_approved",
  "vgmf_application_rejected",
  "vgmf_payment_success",
  "vgmf_payment_failed",
  "vgmf_payment_pending",
  "vgmf_checkin_success",
  "vgmf_checkin_failed",
  "vgmf_ticket_issued",
  "vgmf_ticket_reissued",
  "authentication",
  "hello_world",
]);

export function resolveOtpWhatsAppTemplateName(
  candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;
    if (WHATSAPP_UTILITY_TEMPLATE_NAMES.has(trimmed)) continue;
    if (trimmed === DEFAULT_WHATSAPP_OTP_TEMPLATE_NAME) return trimmed;
    if (/otp|auth|verification/i.test(trimmed)) return trimmed;
  }
  return DEFAULT_WHATSAPP_OTP_TEMPLATE_NAME;
}

export function resolveOtpWhatsAppTemplateLanguage(
  candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }
  return "en";
}

export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationEventTemplate[] = [
  {
    event: "ACCOUNT_CREATED",
    label: "Account created / welcome",
    description: "Sent when a new applicant account is registered.",
    channel: "EMAIL",
    whatsappTemplateName: "vgmf_account_created1",
    whatsappTemplateLanguage: "en",
    emailSubject: "Welcome to {{portal_title}}",
    whatsappStaticTemplate: true,
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
    channel: "EMAIL",
    whatsappTemplateName: "vgmf_registration_success",
    whatsappTemplateLanguage: "en",
    emailSubject: "Application submitted — {{application_number}}",
    whatsappStaticTemplate: true,
  },
  {
    event: "STATUS_UPDATE",
    label: "Application status update",
    description: "When admin changes application workflow status.",
    channel: "EMAIL",
    whatsappTemplateName: "vgmf_under_review",
    whatsappTemplateLanguage: "en",
    emailSubject: "Application status: {{status_label}}",
    whatsappStaticTemplate: true,
  },
  {
    event: "DOCUMENT_REVIEW",
    label: "Document review result",
    description: "When a document is approved, rejected, or needs resubmission.",
    channel: "EMAIL",
    whatsappTemplateName: "vgmf_under_review",
    whatsappTemplateLanguage: "en",
    emailSubject: "Document update: {{document_label}}",
    whatsappStaticTemplate: true,
  },
  {
    event: "INTERVIEW_SCHEDULED",
    label: "Interview scheduled",
    description: "Interview date, time, and meeting link.",
    channel: "EMAIL",
    whatsappTemplateName: "vgmf_under_review",
    whatsappTemplateLanguage: "en",
    emailSubject: "Interview scheduled — VGMF Fellowship",
    whatsappStaticTemplate: true,
  },
  {
    event: "INSTALLMENT_RELEASED",
    label: "Fellowship installment released",
    description: "When a fellowship grant installment is released.",
    channel: "EMAIL",
    whatsappTemplateName: "vgmf_payment_success",
    whatsappTemplateLanguage: "en",
    emailSubject: "Installment {{installment_no}} released",
    whatsappStaticTemplate: true,
  },
  {
    event: "PROGRESS_REPORT_DUE",
    label: "Progress report due",
    description: "Quarterly fellowship progress report reminders.",
    channel: "EMAIL",
    whatsappTemplateName: "vgmf_under_review",
    whatsappTemplateLanguage: "en",
    emailSubject: "Progress report due — Q{{quarter}} {{year}}",
    whatsappStaticTemplate: true,
  },
  {
    event: "SUPPORT_TICKET",
    label: "Support ticket update",
    description: "Applicant support ticket replies and updates.",
    channel: "EMAIL",
    whatsappTemplateName: "vgmf_under_review",
    whatsappTemplateLanguage: "en",
    emailSubject: "Support update: {{ticket_subject}}",
    whatsappStaticTemplate: true,
  },
  {
    event: "SITE_NOTICE",
    label: "Official site notice broadcast",
    description: "When admin publishes a notice to all applicants.",
    channel: "EMAIL",
    whatsappTemplateName: "vgmf_under_review",
    whatsappTemplateLanguage: "en",
    emailSubject: "Portal notice: {{notice_title}}",
    whatsappStaticTemplate: true,
  },
  {
    event: "PORTAL_ALERT",
    label: "General portal alert",
    description: "Other in-portal alerts and admin messages.",
    channel: "EMAIL",
    whatsappTemplateName: "vgmf_under_review",
    whatsappTemplateLanguage: "en",
    emailSubject: "{{alert_title}}",
    whatsappStaticTemplate: true,
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
    const merged = {
      ...base,
      channel: override.channel ?? base.channel,
      whatsappTemplateName: override.whatsappTemplateName ?? base.whatsappTemplateName,
      whatsappTemplateLanguage:
        override.whatsappTemplateLanguage ?? base.whatsappTemplateLanguage,
      emailSubject: override.emailSubject ?? base.emailSubject,
    };
    if (merged.event === "OTP_VERIFICATION") {
      merged.whatsappTemplateName = resolveOtpWhatsAppTemplateName([
        merged.whatsappTemplateName,
      ]);
    }
    return merged;
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

export function applyEmailOnlyAlertChannels(
  templates: NotificationEventTemplate[]
): NotificationEventTemplate[] {
  return templates.map((item) =>
    item.event === "OTP_VERIFICATION"
      ? item
      : {
          ...item,
          channel:
            item.channel === "WHATSAPP" || item.channel === "BOTH" ? "EMAIL" : item.channel,
        }
  );
}

/** Apply Meta template names from the shared VGMF WABA catalog (seminar + fellowship). */
export function applyRecommendedMetaTemplates(
  templates: NotificationEventTemplate[]
): NotificationEventTemplate[] {
  const recommended = mergeNotificationTemplates(null);
  const byEvent = new Map(recommended.map((item) => [item.event, item]));

  return templates.map((item) => {
    const catalog = byEvent.get(item.event);
    if (!catalog) return item;
    return {
      ...item,
      whatsappTemplateName: catalog.whatsappTemplateName,
      whatsappTemplateLanguage: catalog.whatsappTemplateLanguage,
      whatsappStaticTemplate: catalog.whatsappStaticTemplate,
    };
  });
}

const STATUS_WHATSAPP_TEMPLATE: Record<string, string> = {
  REJECTED: "vgmf_application_rejected",
  NOT_ELIGIBLE: "vgmf_application_rejected",
  SELECTED: "vgmf_application_approved",
  SHORTLISTED: "vgmf_application_approved",
  SCRUTINY_APPROVED: "vgmf_application_approved",
  SUBMITTED: "vgmf_registration_success",
};

export function resolveStatusWhatsAppTemplateName(status?: string | null): string {
  if (!status) return "vgmf_under_review";
  return STATUS_WHATSAPP_TEMPLATE[status] ?? "vgmf_under_review";
}

export function isCriticalWhatsAppEvent(event: NotificationEventKey): boolean {
  return CRITICAL_WHATSAPP_EVENTS.includes(event);
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
        level: isCriticalWhatsAppEvent(template.event) ? "error" : "warning",
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
