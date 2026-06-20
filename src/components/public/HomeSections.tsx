import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { SiteContent } from "@/lib/cms";
import { getIcon } from "@/lib/icons";

export function HomeHero({ settings }: { settings: SiteContent }) {
  return (
    <section className="hero-v2 relative overflow-hidden px-5 pb-20 pt-12 sm:px-6 md:pb-28 md:pt-16">
      <div className="pointer-events-none absolute inset-0 hero-v2-glow" />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            {settings.heroBadge && (
              <div className="hero-badge">
                <Sparkles className="h-4 w-4 text-gold" />
                {settings.heroBadge}
              </div>
            )}
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-ink sm:text-5xl md:text-6xl lg:text-[4rem]">
              {settings.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">
              {settings.heroSubtitle}
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              {settings.signupEnabled ? (
                <>
                  <Link href="/register" className="btn-gold gap-2 px-8 py-4 text-base">
                    Start Application
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/#programme" className="btn-secondary px-8 py-4 text-base">
                    Explore programme
                  </Link>
                </>
              ) : (
                <Link href="/#programme" className="btn-gold gap-2 px-8 py-4 text-base">
                  Explore programme
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              {settings.heroStats.map((stat) => (
                <div key={stat.label} className="stat-pill">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {stat.label}
                  </p>
                  <p className="font-display text-xl font-extrabold text-primary-700 sm:text-2xl">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-panel-badge">2026 Cohort</div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-muted">
              Fellowship snapshot
            </p>
            <div className="mt-6 space-y-3">
              {settings.heroSnapshot.map((item) => {
                const Icon = getIcon(item.icon);
                return (
                  <div key={item.title} className="hero-panel-item">
                    <div className="hero-panel-icon">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-ink">{item.title}</p>
                      <p className="text-sm leading-relaxed text-muted">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeTrustStrip({ settings }: { settings: SiteContent }) {
  const items = [
    settings.contactAddress ? "Pune, India" : "India",
    "Ayurvedic Research",
    "Up to ₹75,000 grant",
    "Structured mentorship",
  ];

  return (
    <section className="border-y border-[#dce8e2] bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-4 text-xs font-bold uppercase tracking-[0.18em] text-primary-700 sm:px-6">
        {items.map((item) => (
          <span key={item} className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

export function HomeHighlights({ settings }: { settings: SiteContent }) {
  return (
    <section id="programme" className="px-5 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="section-badge">Programme</span>
          <h2 className="section-title mt-4">{settings.highlightsTitle}</h2>
          <p className="mt-4 text-lg text-muted">{settings.highlightsSubtitle}</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {settings.highlights.map((tile, index) => {
            const Icon = tile.icon ? getIcon(tile.icon) : null;
            const featured = tile.variant === "large" || index === 0;

            return (
              <article
                key={`${tile.title}-${index}`}
                className={`highlight-card ${featured ? "highlight-card-featured md:col-span-2 xl:col-span-1" : ""}`}
              >
                {Icon && (
                  <div className={`highlight-icon ${featured ? "highlight-icon-featured" : ""}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                )}
                <h3 className={`mt-5 font-display text-xl font-bold ${featured ? "text-white" : "text-ink"}`}>
                  {tile.title}
                </h3>
                <p className={`mt-3 text-sm leading-relaxed ${featured ? "text-white/80" : "text-muted"}`}>
                  {tile.desc}
                </p>
                {tile.accent && (
                  <p className="mt-6 font-display text-4xl font-extrabold text-gold">{tile.accent}</p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HomeJourney({ settings }: { settings: SiteContent }) {
  return (
    <section id="apply" className="grid-pattern px-5 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <span className="section-badge">{settings.journeySubtitle}</span>
          <h2 className="section-title mt-4">{settings.journeyTitle}</h2>
        </div>

        <div className="relative mt-14 grid gap-8 md:grid-cols-3">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-12 hidden h-0.5 bg-gradient-to-r from-primary-200 via-gold/60 to-primary-200 md:block" />
          {settings.journeySteps.map((item, index) => {
            const Icon = getIcon(item.icon);
            return (
              <div key={item.step} className="timeline-card">
                <div className="timeline-step">{item.step}</div>
                <div className="timeline-icon">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold text-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.desc}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-primary-600">
                  Step {index + 1} of {settings.journeySteps.length}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          {settings.signupEnabled ? (
            <Link href="/register" className="btn-primary gap-2 px-10 py-4 text-base">
              Register for Fellowship 2026
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <p className="text-sm font-medium text-muted">
              Registration is currently closed. See official notices for updates.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export function HomeCtaBand({ settings }: { settings: SiteContent }) {
  if (!settings.signupEnabled) return null;

  return (
    <section className="px-5 py-16 sm:px-6">
      <div className="cta-band mx-auto max-w-7xl">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
            VGMF Research Fellowship 2026
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-white md:text-4xl">
            Ready to advance Ayurvedic research?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/85">
            Create your applicant account, complete verification, and submit your fellowship proposal
            through our secure portal.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-gold gap-2 px-8 py-3.5">
              Apply now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/rulebook"
              className="btn-secondary border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              Read rulebook
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeAboutContact({ settings }: { settings: SiteContent }) {
  return (
    <section className="px-5 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card bg-gradient-to-br from-gold-soft via-white to-primary-50/40">
            {settings.aboutBadge && <span className="section-badge">{settings.aboutBadge}</span>}
            <h2 className="mt-4 font-display text-3xl font-extrabold text-ink md:text-4xl">
              {settings.aboutTitle}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-soft">{settings.aboutContent}</p>
            {settings.aboutCtaHref && (
              <Link href={settings.aboutCtaHref} className="btn-secondary mt-8">
                {settings.aboutCtaLabel || "Learn more"}
              </Link>
            )}
          </div>

          <div className="card">
            <span className="section-badge">Contact</span>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-ink">Get in touch</h2>
            <p className="mt-2 text-sm text-muted">
              We&apos;re happy to help with applications and fellowship enquiries.
            </p>
            <div className="mt-6 space-y-3">
              {settings.contactEmail && (
                <a href={`mailto:${settings.contactEmail}`} className="contact-card">
                  <span className="contact-card-label">Email</span>
                  <span className="contact-card-value">{settings.contactEmail}</span>
                </a>
              )}
              {settings.contactPhone && (
                <a href={`tel:${settings.contactPhone}`} className="contact-card">
                  <span className="contact-card-label">Phone</span>
                  <span className="contact-card-value">{settings.contactPhone}</span>
                </a>
              )}
              {settings.contactAddress && (
                <div className="contact-card">
                  <span className="contact-card-label">Address</span>
                  <span className="contact-card-value">{settings.contactAddress}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
