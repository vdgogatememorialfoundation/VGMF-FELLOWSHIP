export type NoticeCategory = "EVENT" | "DEADLINE" | "GENERAL" | "URGENT" | "RESULT";

export const NOTICE_CATEGORIES: {
  value: NoticeCategory;
  label: string;
  typeLabel: string;
}[] = [
  { value: "EVENT", label: "Event", typeLabel: "Event notice" },
  { value: "DEADLINE", label: "Deadline", typeLabel: "Deadline notice" },
  { value: "GENERAL", label: "General", typeLabel: "General notice" },
  { value: "URGENT", label: "Urgent", typeLabel: "Urgent notice" },
  { value: "RESULT", label: "Result", typeLabel: "Result notice" },
];

export const NOTICE_CATEGORY_STYLES: Record<
  NoticeCategory,
  { border: string; bg: string; badge: string; badgeText: string }
> = {
  EVENT: {
    border: "border-l-[#1b6b52]",
    bg: "bg-[#eef8f3]",
    badge: "bg-[#1b6b52]/10",
    badgeText: "text-[#1b6b52]",
  },
  DEADLINE: {
    border: "border-l-[#c9a227]",
    bg: "bg-[#fff9eb]",
    badge: "bg-[#c9a227]/15",
    badgeText: "text-[#9a7b1a]",
  },
  URGENT: {
    border: "border-l-[#dc2626]",
    bg: "bg-[#fef2f2]",
    badge: "bg-red-100",
    badgeText: "text-red-700",
  },
  GENERAL: {
    border: "border-l-[#2563eb]",
    bg: "bg-[#eff6ff]",
    badge: "bg-blue-100",
    badgeText: "text-blue-700",
  },
  RESULT: {
    border: "border-l-[#7c3aed]",
    bg: "bg-[#f5f3ff]",
    badge: "bg-violet-100",
    badgeText: "text-violet-700",
  },
};

export function getNoticeTypeLabel(category: NoticeCategory): string {
  return NOTICE_CATEGORIES.find((c) => c.value === category)?.typeLabel ?? "Notice";
}

export function getNoticeCategoryLabel(category: NoticeCategory): string {
  return NOTICE_CATEGORIES.find((c) => c.value === category)?.label ?? "General";
}

export function isNoticeNew(publishedAt: string | Date): boolean {
  const published = new Date(publishedAt);
  const days = (Date.now() - published.getTime()) / (1000 * 60 * 60 * 24);
  return days <= 7;
}
