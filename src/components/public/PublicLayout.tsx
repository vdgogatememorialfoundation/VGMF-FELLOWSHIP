import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, Calendar, User, UserPlus } from "lucide-react";
import { getSiteSettings, getActiveNotices } from "@/lib/cms";
import { AnnouncementTicker } from "./AnnouncementTicker";

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
                className="inline-flex items-center gap-1.5 hover:text-primary-600"
              >
                <Mail className="h-3.5 w-3.5" />
                {settings.contactEmail}
              </a>
            )}
            {settings.contactPhone && (
              <a
                href={`tel:${settings.contactPhone}`}
                className="inline-flex items-center gap-1.5 hover:text-primary-600"
              >
                <Phone className="h-3.5 w-3.5" />
                {settings.contactPhone}
              </a>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Fellowship 2026
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-primary-600 hover:text-primary-700">
              <User className="h-3.5 w-3.5" />
              Sign in
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/register" className="inline-flex items-center gap-1.5 font-semibold text-primary-600 hover:text-primary-700">
              <UserPlus className="h-3.5 w-3.5" />
              Create account
            </Link>
          </div>
        </div>
      </div>

      {settings.tickerEnabled && settings.tickerText && (
        <AnnouncementTicker text={settings.tickerText} />
      )}

      <header className="site-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            {settings.logoUrl ? (
              <Image
                src={settings.logoUrl}
                alt={settings.siteName}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-lg font-bold text-white shadow-sm">
                VG
              </div>
            )}
            <div>
              <h1 className="font-display text-base font-bold leading-tight text-ink sm:text-lg">
                Vaidya Gogate Memorial Foundation
              </h1>
              <p className="text-xs text-muted">{settings.siteTagline || "Fellowship Portal 2026"}</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/" className="text-sm font-medium text-ink-soft hover:text-primary-600">Home</Link>
            <Link href="/about" className="text-sm font-medium text-ink-soft hover:text-primary-600">Foundation</Link>
            <Link href="/#notices" className="text-sm font-medium text-ink-soft hover:text-primary-600">Notices</Link>
            <Link href="/#portals" className="text-sm font-medium text-ink-soft hover:text-primary-600">Portals</Link>
            <Link href="/#contact" className="text-sm font-medium text-ink-soft hover:text-primary-600">Contact</Link>
            <Link href="/register" className="btn-primary text-sm">Apply Now</Link>
          </nav>
        </div>
      </header>
    </div>
  );
}

export async function PublicFooter() {
  const settings = await getSiteSettings();

  return (
    <footer id="contact" className="border-t border-[#e8e2d6] bg-white px-6 py-12">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold text-ink">Vaidya Gogate Memorial Foundation</p>
          <p className="mt-2 text-sm text-muted">{settings.siteTagline}</p>
          <p className="mt-4 text-sm text-muted">Advancing Ayurveda since 1972</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Legal & Info</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/about" className="text-muted hover:text-primary-600">About Us</Link>
            <Link href="/terms" className="text-muted hover:text-primary-600">Terms & Conditions</Link>
            <Link href="/privacy" className="text-muted hover:text-primary-600">Privacy Policy</Link>
            <Link href="/refund-policy" className="text-muted hover:text-primary-600">Refund Policy</Link>
          </div>
        </div>
        <div>
          <p className="font-semibold text-ink">Portals</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/login" className="text-muted hover:text-primary-600">Applicant Login</Link>
            <Link href="/login" className="text-muted hover:text-primary-600">Admin (/admin)</Link>
            <Link href="/login" className="text-muted hover:text-primary-600">Staff (/staff)</Link>
            <Link href="/login" className="text-muted hover:text-primary-600">Reviewer (/reviewer)</Link>
          </div>
          {settings.contactEmail && (
            <p className="mt-4 text-sm text-muted">{settings.contactEmail}</p>
          )}
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-[#e8e2d6] pt-6 text-center text-sm text-muted">
        {settings.footerText ||
          `© ${new Date().getFullYear()} Vaidya Gogate Memorial Foundation. All rights reserved.`}
      </div>
    </footer>
  );
}

export async function NoticesSection() {
  const notices = await getActiveNotices();
  if (notices.length === 0) return null;

  return (
    <section id="notices" className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="section-title">Notices & Announcements</h2>
      <p className="mt-2 text-muted">Important updates for fellowship applicants</p>
      <div className="mt-8 space-y-4">
        {notices.map((notice) => (
          <div
            key={notice.id}
            className="card border-l-4 border-l-gold bg-gold-soft/30"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold text-ink">{notice.title}</h3>
              <span className="rounded-full bg-gold/15 px-3 py-0.5 text-xs font-semibold text-gold">
                {new Date(notice.publishedAt).toLocaleDateString("en-IN")}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{notice.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
