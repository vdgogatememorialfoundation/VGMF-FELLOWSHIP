export type FormScheduleTemplate = {
  isActive: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  closedMessage: string | null;
  name?: string;
};

export type FormSchedulePhase = "disabled" | "upcoming" | "open" | "closed";

export type FormScheduleStatus = {
  phase: FormSchedulePhase;
  open: boolean;
  message: string | null;
  opensAt: string | null;
  closesAt: string | null;
};

const DEFAULT_CLOSED_MESSAGE =
  "Fellowship applications are currently closed. Please check official notices for updates.";

export function getFormScheduleStatus(
  template: FormScheduleTemplate
): FormScheduleStatus {
  const opensAt = template.opensAt?.toISOString() ?? null;
  const closesAt = template.closesAt?.toISOString() ?? null;

  if (!template.isActive) {
    return {
      phase: "disabled",
      open: false,
      message: template.closedMessage || DEFAULT_CLOSED_MESSAGE,
      opensAt,
      closesAt,
    };
  }

  const now = new Date();

  if (template.opensAt && now < template.opensAt) {
    return {
      phase: "upcoming",
      open: false,
      message:
        template.closedMessage ||
        `Applications for ${template.name || "this fellowship"} open on ${template.opensAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`,
      opensAt,
      closesAt,
    };
  }

  if (template.closesAt && now > template.closesAt) {
    return {
      phase: "closed",
      open: false,
      message:
        template.closedMessage ||
        `The application window closed on ${template.closesAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`,
      opensAt,
      closesAt,
    };
  }

  return { phase: "open", open: true, message: null, opensAt, closesAt };
}

/** Whether applicants should see editable form fields (not just status banners). */
export function isFormContentLive(
  schedule: FormScheduleStatus,
  options?: { allowDraftWhileClosed?: boolean; hasDraft?: boolean }
): boolean {
  if (schedule.phase === "open") return true;
  if (options?.allowDraftWhileClosed && options.hasDraft && schedule.phase === "closed") {
    return false;
  }
  return false;
}

export function formatScheduleDateTime(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
