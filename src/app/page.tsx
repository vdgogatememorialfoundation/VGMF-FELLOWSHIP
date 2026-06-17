import Link from "next/link";
import { PublicHeader, PublicFooter, NoticesSection } from "@/components/public/PublicLayout";
import { FaqSection } from "@/components/public/FaqSection";
import { getSiteSettings } from "@/lib/cms";
import {
  GraduationCap,
  FileText,
  Users,
  Award,
  ArrowRight,
  Sparkles,
  BookOpen,
  IndianRupee,
  Microscope,
  BadgeCheck,
  Bell,
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

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pb-16 pt-10 sm:px-6 md:pb-24 md:pt-14">
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-60" />
        <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-primary-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-gold/25 blur-3xl" />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-700 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4 text-gold" />
                Fellowship 2026 · Applications Open
              </div>
              <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
                {settings.heroTitle || "VGMF Research Fellowship"}
                <span className="mt-2 block text-gradient">2026</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
                {settings.heroSubtitle ||
                  "Fund your Ayurvedic research journey with grants up to ₹75,000. Built for the next generation of Viddhakarma scholars."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="btn-gold gap-2 px-8 py-3.5 text-base">
                  Start Application
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/#highlights" className="btn-secondary px-8 py-3.5 text-base">
                  Explore programme
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                {[
                  { label: "Grant up to", value: "₹75,000" },
                  { label: "Tracking", value: "12-digit ID" },
                  { label: "Focus", value: "Viddhakarma" },
                ].map((stat) => (
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
                {[
                  { icon: Microscope, title: "Research-first", desc: "Clinical & evidence-based proposals" },
                  { icon: BadgeCheck, title: "Transparent review", desc: "Scoring, shortlist & final award" },
                  { icon: Bell, title: "Live updates", desc: "Notices, email & dashboard alerts" },
                ].map((item) => {
                  const Icon = item.icon;
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

      {/* Bento highlights */}
      <section id="highlights" className="px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="section-badge">Why apply</span>
            <h2 className="section-title mt-4">Programme highlights</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted">
              Clinical research, mentorship, and structured funding — designed like our national seminar experience.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-6 md:grid-rows-2">
            <div className="bento-tile md:col-span-3 md:row-span-2 bg-gradient-to-br from-primary-700 to-primary-900 text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <IndianRupee className="h-6 w-6 text-gold" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-extrabold">Research grants</h3>
              <p className="mt-3 max-w-sm text-white/80">
                Up to ₹75,000 for approved fellowship proposals with milestone-based fund release.
              </p>
              <p className="mt-8 font-display text-5xl font-extrabold text-gold">₹75K</p>
            </div>

            <div className="bento-tile md:col-span-3">
              <Users className="h-7 w-7 text-primary-600" />
              <h3 className="mt-4 font-display text-xl font-bold text-ink">Expert review panel</h3>
              <p className="mt-2 text-sm text-muted">
                Reviewer scoring, committee remarks, and structured shortlisting.
              </p>
            </div>

            <div className="bento-tile md:col-span-3">
              <BookOpen className="h-7 w-7 text-primary-600" />
              <h3 className="mt-4 font-display text-xl font-bold text-ink">Viddhakarma focus</h3>
              <p className="mt-2 text-sm text-muted">
                Evidence-based Ayurvedic research with real clinical relevance.
              </p>
            </div>

            <div className="bento-tile md:col-span-2">
              <FileText className="h-7 w-7 text-gold" />
              <h3 className="mt-4 font-display text-lg font-bold text-ink">Smart tracking</h3>
              <p className="mt-2 text-sm text-muted">12-digit application number + live status.</p>
            </div>

            <div className="bento-tile md:col-span-2">
              <Award className="h-7 w-7 text-gold" />
              <h3 className="mt-4 font-display text-lg font-bold text-ink">Installment payouts</h3>
              <p className="mt-2 text-sm text-muted">40/40/20 disbursement after milestones.</p>
            </div>

            <div className="bento-tile md:col-span-2 border-dashed border-primary-300 bg-primary-50/50">
              <GraduationCap className="h-7 w-7 text-primary-600" />
              <h3 className="mt-4 font-display text-lg font-bold text-ink">Built for practitioners</h3>
              <p className="mt-2 text-sm text-muted">Register, apply, and track — all in one place.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Application journey */}
      <section id="apply" className="grid-pattern px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="section-badge">3 simple steps</span>
            <h2 className="section-title mt-4">Your application journey</h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Register & verify",
                desc: "Create your account with WhatsApp OTP verification and get your User ID.",
                icon: GraduationCap,
                color: "from-primary-500 to-primary-700",
              },
              {
                step: "02",
                title: "Submit proposal",
                desc: "Complete the fellowship form, upload documents, and receive your 12-digit tracking number.",
                icon: FileText,
                color: "from-[#2d9b72] to-[#1b6b52]",
              },
              {
                step: "03",
                title: "Review & award",
                desc: "Reviewers score your work, interviews may follow, and selected fellows receive grants.",
                icon: Award,
                color: "from-gold to-[#b8860b]",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="card group relative overflow-hidden">
                  <div
                    className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${item.color}`}
                  />
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
            <Link href="/register" className="btn-primary gap-2 px-10 py-3.5 text-base">
              Register for Fellowship 2026
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <FaqSection />

      {/* About + contact */}
      <section className="px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card bg-gradient-to-br from-gold-soft to-white">
              <span className="section-badge">Since 1972</span>
              <h2 className="mt-4 font-display text-3xl font-extrabold text-ink">
                About the foundation
              </h2>
              <p className="mt-4 leading-relaxed text-ink-soft">
                The Vaidya Gogate Memorial Foundation advances Ayurvedic education and research.
                The 2026 Fellowship empowers practitioners to contribute meaningful work in
                Viddhakarma and allied sciences.
              </p>
              <Link href="/about" className="btn-secondary mt-6">
                Learn more
              </Link>
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
                <div className="flex items-center gap-4 rounded-2xl border border-[#e4ede8] p-4">
                  <MapPin className="h-5 w-5 text-primary-600" />
                  <span className="text-sm font-semibold text-ink-soft">Vaidya Gogate Memorial Foundation, India</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
