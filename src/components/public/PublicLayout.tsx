import Link from "next/link";
import { Mail, Phone, Calendar, UserPlus } from "lucide-react";
import { getSiteSettings, getActiveNotices } from "@/lib/cms";
import { AnnouncementTicker } from "./AnnouncementTicker";
import { OfficialNotices, OfficialNoticesEmpty, type PublicNotice } from "./OfficialNotices";
import { MobileNav } from "./MobileNav";

export async function PublicHeader() {
  const settings = await getSiteSettings();
  const navLinks = [
    ...settings.navLinks,
    { href: "/#contact", label: "Contact" },
  ];

  return (
    <div className="sticky top-0 z-50">
      <div className="utility-bar">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-2.5 sm:px-6">
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
            {settings.utilityBarText && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-primary-700">
                <Calendar className="h-3.5 w-3.5" />
                {settings.utilityBarText}
              </span>
            )}
          </div>
          {settings.signupEnabled && (
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-primary-700"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Apply / Register
            </Link>
          )}
        </div>
      </div>

      {settings.tickerEnabled && settings.tickerText && (
        <AnnouncementTicker text={settings.tickerText} />
      )}

      <header className="site-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoUrl}
                alt={settings.siteName}
                width={48}
                height={48}
                className="h-11 w-11 rounded-2xl object-contain"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-sm font-extrabold text-white shadow-lg">
                VG
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-extrabold leading-tight text-ink sm:text-base">
                {settings.headerOrgName}
              </p>
              <p className="truncate text-xs font-medium text-muted">
                {settings.siteTagline || "Fellowship Portal 2026"}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {settings.navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-primary-50 hover:text-primary-700"
              >
                {item.label}
              </Link>
            ))}
            {settings.signupEnabled && (
              <Link href="/register" className="btn-primary ml-2 text-sm">
                Apply Now
              </Link>
            )}
          </nav>

          <MobileNav links={navLinks} signupEnabled={settings.signupEnabled} />
        </div>
      </header>
    </div>
  );
}

export async function PublicFooter() {
  const settings = await getSiteSettings();

  return (
    <footer id="contact" className="relative overflow-hidden border-t border-[#e4ede8] bg-ink px-6 py-14 text-white">
      <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl" />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="font-display text-xl font-extrabold">{settings.headerOrgName}</p>
            <p className="mt-3 text-sm text-white/70">{settings.siteTagline}</p>
            {settings.footerAboutText && (
              <p className="mt-4 text-sm text-white/60">{settings.footerAboutText}</p>
            )}
          </div>
          <div>
            <p className="font-display font-bold">Quick links</p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-white/70">
              {settings.footerQuickLinks
                .filter((link) => settings.signupEnabled || link.href !== "/register")
                .map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-gold">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="font-display font-bold">Legal & contact</p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-white/70">
              {settings.footerLegalLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-gold">
                  {link.label}
                </Link>
              ))}
              {settings.contactEmail && <span>{settings.contactEmail}</span>}
              {settings.contactPhone && <span>{settings.contactPhone}</span>}
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-white/55">
          <p>
            {settings.footerText ||
              `© ${new Date().getFullYear()} Vaidya Gogate Memorial Foundation. All rights reserved.`}
          </p>
          {settings.footerDeveloperCredit && (
            <p className="mt-2">{settings.footerDeveloperCredit}</p>
          )}
        </div>
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
