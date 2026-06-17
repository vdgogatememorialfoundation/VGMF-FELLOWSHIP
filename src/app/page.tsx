import Link from "next/link";
import { PublicHeader, PublicFooter, NoticesSection } from "@/components/public/PublicLayout";
import { FaqSection } from "@/components/public/FaqSection";
import { getSiteSettings } from "@/lib/cms";
import { getIcon } from "@/lib/icons";
import {
  ArrowRight,
  Sparkles,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSiteSettings();

  return (
    <div className="min-h-screen mesh-bg">
      <PublicHeader />

      <section className="relative overflow-hidden px-5 pb-16 pt-10 sm:px-6 md:pb-24 md:pt-14">
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-60" />
        <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-primary-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-gold/25 blur-3xl" />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              {settings.heroBadge && (
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-700 shadow-sm backdrop-blur">
                  <Sparkles className="h-4 w-4 text-gold" />
                  {settings.heroBadge}
                </div>
              )}
              <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
                {settings.heroTitle || "VGMF Research Fellowship"}
                <span className="mt-2 block text-gradient">2026</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
                {settings.heroSubtitle}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {settings.signupEnabled ? (
                  <>
                    <Link href="/register" className="btn-gold gap-2 px-8 py-3.5 text-base">
                      Start Application
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/#highlights" className="btn-secondary px-8 py-3.5 text-base">
                      Explore programme
                    </Link>
                  </>
                ) : (
                  <Link href="/#highlights" className="btn-gold gap-2 px-8 py-3.5 text-base">
                    Explore programme
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                {settings.heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-[#e4ede8] bg-white/80 px-4 py-3 backdrop-blur"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      {stat.label}
                    </p>
                    <p className="font-display text-lg font-extrabold text-primary-700">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card relative p-6 sm:p-8">
              <div className="absolute -right-3 -top-3 rounded-2xl bg-gold px-3 py-1 text-xs font-bold text-white shadow-lg">
                2026 Cohort
              </div>
              <p className="font-display text-sm font-bold uppercase tracking-widest text-muted">
                Fellowship snapshot
              </p>
              <div className="mt-6 space-y-4">
                {settings.heroSnapshot.map((item) => {
                  const Icon = getIcon(item.icon);
                  return (
                    <div key={item.title} className="flex gap-4 rounded-2xl bg-primary-50/80 p-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-display font-bold text-ink">{item.title}</p>
                        <p className="text-sm text-muted">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <NoticesSection />

      <section id="highlights" className="px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="section-badge">Why apply</span>
            <h2 className="section-title mt-4">{settings.highlightsTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted">{settings.highlightsSubtitle}</p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-6 md:grid-rows-2">
            {settings.highlights.map((tile, index) => {
              const Icon = tile.icon ? getIcon(tile.icon) : null;
              const isLarge = tile.variant === "large";
              const isDashed = tile.variant === "dashed";

              return (
                <div
                  key={`${tile.title}-${index}`}
                  className={`bento-tile ${
                    isLarge
                      ? "md:col-span-3 md:row-span-2 bg-gradient-to-br from-primary-700 to-primary-900 text-white"
                      : isDashed
                        ? "md:col-span-2 border-dashed border-primary-300 bg-primary-50/50"
                        : index === 1
                          ? "md:col-span-3"
                          : index === 2
                            ? "md:col-span-3"
                            : "md:col-span-2"
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`h-7 w-7 ${isLarge ? "text-gold" : isDashed ? "text-primary-600" : index < 3 ? "text-primary-600" : "text-gold"}`}
                    />
                  )}
                  <h3
                    className={`mt-4 font-display font-bold ${isLarge ? "text-2xl font-extrabold" : "text-lg text-ink"}`}
                  >
                    {tile.title}
                  </h3>
                  <p className={`mt-2 text-sm ${isLarge ? "max-w-sm text-white/80" : "text-muted"}`}>
                    {tile.desc}
                  </p>
                  {tile.accent && (
                    <p className="mt-8 font-display text-5xl font-extrabold text-gold">{tile.accent}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="apply" className="grid-pattern px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="section-badge">{settings.journeySubtitle}</span>
            <h2 className="section-title mt-4">{settings.journeyTitle}</h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {settings.journeySteps.map((item, index) => {
              const Icon = getIcon(item.icon);
              const colors = [
                "from-primary-500 to-primary-700",
                "from-[#2d9b72] to-[#1b6b52]",
                "from-gold to-[#b8860b]",
              ];
              return (
                <div key={item.step} className="card group relative overflow-hidden">
                  <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${colors[index % colors.length]}`} />
                  <p className="font-display text-4xl font-extrabold text-primary-100">{item.step}</p>
                  <div className="mt-4 inline-flex rounded-2xl bg-primary-50 p-3 text-primary-600 transition group-hover:scale-110">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            {settings.signupEnabled ? (
              <Link href="/register" className="btn-primary gap-2 px-10 py-3.5 text-base">
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

      <FaqSection
        title={settings.faqTitle}
        subtitle={settings.faqSubtitle}
        items={settings.faqItems}
      />

      <section className="px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card bg-gradient-to-br from-gold-soft to-white">
              {settings.aboutBadge && <span className="section-badge">{settings.aboutBadge}</span>}
              <h2 className="mt-4 font-display text-3xl font-extrabold text-ink">
                {settings.aboutTitle}
              </h2>
              <p className="mt-4 leading-relaxed text-ink-soft">{settings.aboutContent}</p>
              {settings.aboutCtaHref && (
                <Link href={settings.aboutCtaHref} className="btn-secondary mt-6">
                  {settings.aboutCtaLabel || "Learn more"}
                </Link>
              )}
            </div>

            <div className="card">
              <h2 className="font-display text-2xl font-extrabold text-ink">Contact us</h2>
              <p className="mt-2 text-sm text-muted">We&apos;re happy to help with applications and enquiries.</p>
              <div className="mt-6 space-y-4">
                {settings.contactEmail && (
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="flex items-center gap-4 rounded-2xl border border-[#e4ede8] p-4 transition hover:border-primary-300 hover:bg-primary-50/50"
                  >
                    <Mail className="h-5 w-5 text-primary-600" />
                    <span className="text-sm font-semibold text-ink-soft">{settings.contactEmail}</span>
                  </a>
                )}
                {settings.contactPhone && (
                  <a
                    href={`tel:${settings.contactPhone}`}
                    className="flex items-center gap-4 rounded-2xl border border-[#e4ede8] p-4 transition hover:border-primary-300 hover:bg-primary-50/50"
                  >
                    <Phone className="h-5 w-5 text-primary-600" />
                    <span className="text-sm font-semibold text-ink-soft">{settings.contactPhone}</span>
                  </a>
                )}
                {settings.contactAddress && (
                  <div className="flex items-center gap-4 rounded-2xl border border-[#e4ede8] p-4">
                    <MapPin className="h-5 w-5 text-primary-600" />
                    <span className="text-sm font-semibold text-ink-soft">{settings.contactAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
