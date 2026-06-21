import Link from "next/link";
import { Mail, Phone, Calendar, UserPlus, MapPin, ExternalLink } from "lucide-react";
import { getSiteSettings, getActiveNotices, getPublicFormSchedule } from "@/lib/cms";
import { AnnouncementTicker } from "./AnnouncementTicker";
import { OfficialNotices, OfficialNoticesEmpty, type PublicNotice } from "./OfficialNotices";
import { MobileNav } from "./MobileNav";
import { FormScheduleCountdown } from "@/components/forms/FormScheduleCountdown";

export async function PublicHeader() {
  const [settings, applicationWindow] = await Promise.all([
    getSiteSettings(),
    getPublicFormSchedule(),
  ]);
  const upcoming = applicationWindow?.schedule.phase === "upcoming";
  const applyOpen =
    settings.signupEnabled &&
    (!applicationWindow || applicationWindow.schedule.phase === "open");
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
          {upcoming && applicationWindow?.schedule.opensAt && (
            <FormScheduleCountdown
              targetIso={applicationWindow.schedule.opensAt}
              target="opens"
              variant="compact"
            />
          )}
          {settings.signupEnabled && applyOpen && (
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-primary-700"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Apply / Register
            </Link>
          )}
          {settings.signupEnabled && upcoming && (
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-white px-4 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-50"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Register early
            </Link>
          )}
        </div>
      </div>

      {settings.tickerEnabled && settings.tickerText && (
        <AnnouncementTicker text={settings.tickerText} />
      )}

      <header className="site-header-v2">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3.5">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoUrl}
                alt={settings.headerOrgName || settings.siteName}
                width={52}
                height={52}
                className="h-12 w-12 rounded-2xl object-contain"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-xs font-extrabold text-white shadow-md">
                VGMF
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-extrabold leading-tight text-ink sm:text-base md:text-lg">
                {settings.headerOrgName}
              </p>
              <p className="truncate text-xs font-medium text-muted sm:text-sm">
                {settings.siteTagline || "Fellowship Portal 2026"}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {settings.navLinks.map((item) => (
              <Link key={item.href} href={item.href} className="nav-link-v2">
                {item.label}
              </Link>
            ))}
            {settings.signupEnabled && applyOpen && (
              <Link href="/register" className="btn-primary ml-3 text-sm">
                Apply Now
              </Link>
            )}
            {settings.signupEnabled && upcoming && (
              <Link href="/register" className="btn-secondary ml-3 text-sm">
                Register early
              </Link>
            )}
          </nav>

          <MobileNav
            links={navLinks}
            signupEnabled={settings.signupEnabled && (applyOpen || !!upcoming)}
          />
        </div>
      </header>
    </div>
  );
}

export async function PublicFooter() {
  const settings = await getSiteSettings();

  return (
    <footer
      id="contact"
      className="relative overflow-hidden border-t border-[#e4ede8] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4faf7]"
    >
      <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logoUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-2xl object-contain"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-sm font-extrabold text-primary-700">
                  VG
                </div>
              )}
              <div>
                <p className="font-display text-lg font-extrabold text-ink">
                  {settings.headerOrgName}
                </p>
                <p className="text-sm text-muted">{settings.siteTagline}</p>
              </div>
            </div>
            {settings.footerAboutText && (
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
                {settings.footerAboutText}
              </p>
            )}
            <div className="mt-5 space-y-2 text-sm text-ink-soft">
              {settings.contactEmail && (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="flex items-center gap-2 hover:text-primary-700"
                >
                  <Mail className="h-4 w-4 text-primary-500" />
                  {settings.contactEmail}
                </a>
              )}
              {settings.contactPhone && (
                <a
                  href={`tel:${settings.contactPhone}`}
                  className="flex items-center gap-2 hover:text-primary-700"
                >
                  <Phone className="h-4 w-4 text-primary-500" />
                  {settings.contactPhone}
                </a>
              )}
              {settings.contactAddress && (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                  <span>{settings.contactAddress}</span>
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-ink">
              Quick links
            </p>
            <nav className="mt-4 flex flex-col gap-2.5">
              {settings.footerQuickLinks
                .filter((link) => settings.signupEnabled || link.href !== "/register")
                .map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-ink-soft transition hover:text-primary-700"
                  >
                    {link.label}
                  </Link>
                ))}
              <Link
                href="/applicant"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
              >
                Applicant login
                <ExternalLink className="h-3 w-3" />
              </Link>
            </nav>
          </div>

          <div className="lg:col-span-4">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-ink">
              Legal & policies
            </p>
            <nav className="mt-4 flex flex-col gap-2.5">
              {settings.footerLegalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-ink-soft transition hover:text-primary-700"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[#e8f0ec] pt-8 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-muted">
            {settings.footerText ||
              `© ${new Date().getFullYear()} Vaidya Gogate Memorial Foundation. All rights reserved.`}
          </p>
          {settings.footerDeveloperCredit && (
            <p className="text-xs text-muted">{settings.footerDeveloperCredit}</p>
          )}
        </div>
      </div>
    </footer>
  );
}

export async function NoticesSection() {
  const notices = await getActiveNotices();
  if (notices.length === 0) return <OfficialNoticesEmpty />;

  return <OfficialNotices notices={notices as PublicNotice[]} />;
}
