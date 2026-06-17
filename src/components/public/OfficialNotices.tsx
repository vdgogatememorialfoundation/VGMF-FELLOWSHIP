"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone, Pin, Sparkles, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import {
  NOTICE_CATEGORIES,
  NOTICE_CATEGORY_STYLES,
  getNoticeTypeLabel,
  getNoticeCategoryLabel,
  isNoticeNew,
  type NoticeCategory,
} from "@/lib/notices";

export interface PublicNotice {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  linkUrl: string | null;
  linkLabel: string | null;
  priority: number;
  publishedAt: string;
  expiresAt: string | null;
}

const PREVIEW_LIMIT = 3;
const CONTENT_PREVIEW_CHARS = 140;

function NoticeItem({ notice }: { notice: PublicNotice }) {
  const [expanded, setExpanded] = useState(false);
  const styles = NOTICE_CATEGORY_STYLES[notice.category] ?? NOTICE_CATEGORY_STYLES.GENERAL;
  const isLong = notice.content.length > CONTENT_PREVIEW_CHARS;
  const displayContent =
    expanded || !isLong
      ? notice.content
      : `${notice.content.slice(0, CONTENT_PREVIEW_CHARS).trim()}…`;

  return (
    <article
      className={`rounded-2xl border-l-4 px-4 py-3.5 ${styles.border} ${styles.bg}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles.badge} ${styles.badgeText}`}
        >
          {getNoticeTypeLabel(notice.category)}
        </span>
        {notice.priority >= 10 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-[#9a7b1a]">
            <Pin className="h-3 w-3" />
            Pinned
          </span>
        )}
        {isNoticeNew(notice.publishedAt) && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
            <Sparkles className="h-3 w-3" />
            New
          </span>
        )}
      </div>

      <h3 className="mt-2 text-base font-bold text-[#1e293b]">{notice.title}</h3>
      <p className="mt-0.5 text-sm text-[#64748b]">
        {new Date(notice.publishedAt).toLocaleDateString("en-IN")}
        {notice.expiresAt && (
          <span className="ml-2 text-xs">
            · Valid till {new Date(notice.expiresAt).toLocaleDateString("en-IN")}
          </span>
        )}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#334155] whitespace-pre-wrap">
        {displayContent}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Read more <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}
        {notice.linkUrl && (
          <Link
            href={notice.linkUrl}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            {notice.linkLabel || "Learn more"}
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </article>
  );
}

export function OfficialNotices({ notices }: { notices: PublicNotice[] }) {
  const [filter, setFilter] = useState<NoticeCategory | "ALL">("ALL");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "ALL") return notices;
    return notices.filter((n) => n.category === filter);
  }, [notices, filter]);

  const visible = showAll ? filtered : filtered.slice(0, PREVIEW_LIMIT);
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<NoticeCategory, number>> = {};
    for (const notice of notices) {
      counts[notice.category] = (counts[notice.category] ?? 0) + 1;
    }
    return counts;
  }, [notices]);

  return (
    <section id="notices" className="px-6 py-10 bg-gradient-to-b from-primary-50/50 to-transparent">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-primary-100 bg-white p-5 shadow-[0_20px_60px_rgba(27,107,82,0.1)] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Megaphone className="h-5 w-5 text-primary-500" aria-hidden />
              <h2 className="font-display text-xl font-extrabold text-ink">Official notices</h2>
            </div>
            <span className="rounded-full bg-[#f4faf7] px-2.5 py-0.5 text-xs font-medium text-muted">
              {filtered.length} active
            </span>
          </div>

          {notices.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilter("ALL")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filter === "ALL"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All ({notices.length})
              </button>
              {NOTICE_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.value] ?? 0;
                if (count === 0) return null;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFilter(cat.value)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      filter === cat.value
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e8e2d6] bg-[#faf8f3] px-4 py-8 text-center">
              <Megaphone className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-ink">No notices in this category</p>
              <p className="mt-1 text-xs text-muted">Check back later for updates.</p>
            </div>
          ) : (
            <>
              <div
                className={`space-y-3 ${showAll && filtered.length > 4 ? "max-h-96 overflow-y-auto pr-1" : ""}`}
              >
                {visible.map((notice) => (
                  <NoticeItem key={notice.id} notice={notice} />
                ))}
              </div>

              {filtered.length > PREVIEW_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-4 w-full rounded-xl border border-[#e8e2d6] py-2 text-sm font-semibold text-primary-600 transition hover:bg-[#f4faf7]"
                >
                  {showAll
                    ? "Show fewer notices"
                    : `View all ${filtered.length} notices`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function OfficialNoticesEmpty() {
  return (
    <section id="notices" className="bg-gradient-to-b from-primary-50/50 to-transparent px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-primary-100 bg-white p-6 text-center shadow-[0_20px_60px_rgba(27,107,82,0.1)]">
          <Megaphone className="mx-auto h-8 w-8 text-primary-500" />
          <h2 className="mt-3 font-display text-lg font-extrabold text-ink">Official notices</h2>
          <p className="mt-2 text-sm text-muted">No active notices right now — check back soon ✦</p>
        </div>
      </div>
    </section>
  );
}
