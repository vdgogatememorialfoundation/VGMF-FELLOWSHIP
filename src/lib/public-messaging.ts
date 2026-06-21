import type { FormScheduleStatus } from "@/lib/form-schedule";

/** Whether the fellowship application window is currently open for applicants. */
export function applicationsArePubliclyOpen(
  schedule?: FormScheduleStatus | null
): boolean {
  if (!schedule) return true;
  return schedule.phase === "open";
}

/** Detect copy that claims applications are currently open. */
export function isApplicationsOpenMessaging(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("applications now open") ||
    lower.includes("application window is open") ||
    (lower.includes("application") &&
      (lower.includes("now open") ||
        lower.includes("are open") ||
        lower.includes("currently open") ||
        lower.includes("register on the portal")))
  );
}

export function resolveHeroBadge(
  heroBadge: string | null | undefined,
  schedule?: FormScheduleStatus | null
): string | null {
  if (!heroBadge?.trim()) return null;
  if (applicationsArePubliclyOpen(schedule)) return heroBadge;
  if (!isApplicationsOpenMessaging(heroBadge)) return heroBadge;

  if (schedule?.phase === "upcoming") return "Fellowship 2026 · Opening soon";
  return "Fellowship 2026";
}

export function resolveTickerText(
  tickerEnabled: boolean,
  tickerText: string | null | undefined,
  schedule?: FormScheduleStatus | null
): string | null {
  if (!tickerEnabled || !tickerText?.trim()) return null;
  if (!applicationsArePubliclyOpen(schedule) && isApplicationsOpenMessaging(tickerText)) {
    return null;
  }
  return tickerText;
}

export function filterNoticesForPublicDisplay<
  T extends { title: string; content: string },
>(notices: T[], schedule?: FormScheduleStatus | null): T[] {
  if (applicationsArePubliclyOpen(schedule)) return notices;
  return notices.filter(
    (notice) => !isApplicationsOpenMessaging(`${notice.title} ${notice.content}`)
  );
}

export type PublicMessagingStatus = {
  noticeLive: boolean;
  tickerLive: boolean;
  heroBadgeLive: boolean;
  noticeTitle?: string;
  tickerText?: string;
  heroBadge?: string;
  formPhase?: FormScheduleStatus["phase"];
};

export function getPublicMessagingStatus(input: {
  notices: Array<{ title: string; isActive: boolean }>;
  tickerEnabled: boolean;
  tickerText?: string | null;
  heroBadge?: string | null;
  formPhase?: FormScheduleStatus["phase"];
}): PublicMessagingStatus {
  const liveNotice = input.notices.find((n) => n.isActive);
  return {
    noticeLive: Boolean(liveNotice),
    noticeTitle: liveNotice?.title,
    tickerLive: Boolean(input.tickerEnabled && input.tickerText?.trim()),
    tickerText: input.tickerText || undefined,
    heroBadgeLive: Boolean(
      input.heroBadge?.trim() && isApplicationsOpenMessaging(input.heroBadge)
    ),
    heroBadge: input.heroBadge || undefined,
    formPhase: input.formPhase,
  };
}
