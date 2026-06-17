import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, Sparkles, UserPlus } from "lucide-react";
import { getSiteSettings, getActiveNotices } from "@/lib/cms";
import { AnnouncementTicker } from "./AnnouncementTicker";
import { OfficialNotices, OfficialNoticesEmpty, type PublicNotice } from "./OfficialNotices";
import { PublicNav } from "./PublicNav";

export async function PublicHeader() {
  const settings = await getSiteSettings();

  return (
    <div className="sticky top-0 z-50">
      <div className="utility-bar">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-2">
          <div className="flex flex-wrap items-center gap-4">
            {settings.contactEmail && (
              <a
                href={`mailto:${settings.contactEmail}`}
                className="inline-flex items-center gap-1.5 font-medium hover:text-primary-600"
              >
                <Mail className="h-3.5 w-3.5" />
                {settings.contactEmail}
              </a>
            )}
            {settings.contactPhone && (
              <a
                href={`tel:${settings.contactPhone}`}
                className="inline-flex items-center gap-1.5 font-medium hover:text-primary-600"
              >
                <Phone className="h-3.5 w-3.5" />
                {settings.contactPhone}
              </a>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-700">
              <Sparkles className="h-3 w-3" />
              2026 Open
            </span>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-primary-700"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Apply now
          </Link>
        </div>
      </div>

      {settings.tickerEnabled && settings.tickerText && (
        <AnnouncementTicker text={settings.tickerText} />
      )}

      <header className="site-header relative">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-3">
            {settings.logoUrl ? (
              <Image
                src={settings.logoUrl}
                alt={settings.siteName}
                width={48}
                height={48}
                className="h-11 w-11 rounded-2xl object-contain"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-extrabold text-white shadow-lg">
                VG
              </div>
            )}
            <div>
              <p className="font-display text-sm font-extrabold leading-tight text-ink sm:text-base">
                Vaidya Gogate Memorial Foundation
              </p>
              <p className="text-[11px] font-semibold text-muted">
                {settings.siteTagline || "Fellowship Portal 2026"}
              </p>
            </div>
          </Link>
          <PublicNav />
        </div>
      </header>
    </div>
  );
}

export async function PublicFooter() {
  const settings = await getSiteSettings();

  return (
    <footer id="contact" className="dark-section border-t border-white/10 px-6 py-12">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
        <div>
          <p className="font-display text-xl font-extrabold text-white">
            Vaidya Gogate Memorial Foundation
          </p>
          <p className="mt-2 text-sm text-white/60">{settings.siteTagline}</p>
          <p className="mt-3 text-sm text-white/50">Advancing Ayurveda since 1972</p>
          {settings.contactEmail && (
            <p className="mt-4 text-sm text-white/60">{settings.contactEmail}</p>
          )}
          {settings.contactPhone && (
            <p className="text-sm text-white/60">{settings.contactPhone}</p>
          )}
        </div>
        <div>
          <p className="font-bold text-white">Legal & Info</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/about" className="text-white/60 transition hover:text-neon">
              About Us
            </Link>
            <Link href="/terms" className="text-white/60 transition hover:text-neon">
              Terms & Conditions
            </Link>
            <Link href="/privacy" className="text-white/60 transition hover:text-neon">
              Privacy Policy
            </Link>
            <Link href="/refund-policy" className="text-white/60 transition hover:text-neon">
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl border-t border-white/10 pt-6 text-center text-sm text-white/45">
        <p>
          {settings.footerText ||
            `© ${new Date().getFullYear()} Vaidya Gogate Memorial Foundation. All rights reserved.`}
        </p>
        <p className="mt-1">
          Developed by Capture Visual Studios · Vaidya Gogate Memorial Foundation Copyrights
        </p>
      </div>
    </footer>
  );
}

export async function NoticesSection() {
  const notices = await getActiveNotices();
  if (notices.length === 0) return <OfficialNoticesEmpty />;

  const payload: PublicNotice[] = notices.map((notice) => ({
    id: notice.id,
    title: notice.title,
    content: notice.content,
    category: (notice.category ?? "GENERAL") as PublicNotice["category"],
    linkUrl: notice.linkUrl,
    linkLabel: notice.linkLabel,
    priority: notice.priority,
    publishedAt: notice.publishedAt.toISOString(),
    expiresAt: notice.expiresAt?.toISOString() ?? null,
  }));

  return <OfficialNotices notices={payload} />;
}
