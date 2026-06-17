import Link from "next/link";
import Image from "next/image";
import { getSiteSettings } from "@/lib/cms";
import { AnnouncementTicker } from "./AnnouncementTicker";

export async function PublicHeader() {
  const settings = await getSiteSettings();

  return (
    <>
      {settings.tickerEnabled && settings.tickerText && (
        <AnnouncementTicker text={settings.tickerText} />
      )}
      <header className="border-b border-gray-200 bg-white">
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
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-600 text-lg font-bold text-white">
                VG
              </div>
            )}
            <div>
              <p className="text-sm font-semibold leading-tight text-gray-900 sm:text-base">
                {settings.siteName}
              </p>
              {settings.siteTagline && (
                <p className="text-xs text-gray-500">{settings.siteTagline}</p>
              )}
            </div>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/about" className="text-sm text-gray-600 hover:text-gray-900">
              About Us
            </Link>
            <Link href="/#notices" className="text-sm text-gray-600 hover:text-gray-900">
              Notices
            </Link>
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              Apply Now
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}

export async function PublicFooter() {
  const settings = await getSiteSettings();

  return (
    <footer className="border-t border-gray-200 bg-white px-6 py-10">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
        <div>
          <p className="font-semibold text-gray-900">{settings.siteName}</p>
          <p className="mt-2 text-sm text-gray-600">{settings.siteTagline}</p>
          {settings.contactEmail && (
            <p className="mt-2 text-sm text-gray-600">{settings.contactEmail}</p>
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-900">Quick Links</p>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <Link href="/about" className="text-gray-600 hover:text-primary-600">About Us</Link>
            <Link href="/terms" className="text-gray-600 hover:text-primary-600">Terms & Conditions</Link>
            <Link href="/privacy" className="text-gray-600 hover:text-primary-600">Privacy Policy</Link>
            <Link href="/refund-policy" className="text-gray-600 hover:text-primary-600">Refund Policy</Link>
          </div>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Portals</p>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <Link href="/login" className="text-gray-600 hover:text-primary-600">Applicant Login</Link>
            <Link href="/login" className="text-gray-600 hover:text-primary-600">Admin Portal (/admin)</Link>
            <Link href="/login" className="text-gray-600 hover:text-primary-600">Staff Portal (/staff)</Link>
            <Link href="/login" className="text-gray-600 hover:text-primary-600">Reviewer Portal (/reviewer)</Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t pt-6 text-center text-sm text-gray-500">
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
      <h2 className="text-2xl font-bold text-gray-900">Notices & Announcements</h2>
      <div className="mt-6 space-y-4">
        {notices.map((notice) => (
          <div key={notice.id} className="card border-l-4 border-l-primary-500">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900">{notice.title}</h3>
              <span className="text-xs text-gray-500">
                {new Date(notice.publishedAt).toLocaleDateString("en-IN")}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{notice.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
