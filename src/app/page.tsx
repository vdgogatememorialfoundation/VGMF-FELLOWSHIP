import Link from "next/link";
import { PublicHeader, PublicFooter, NoticesSection } from "@/components/public/PublicLayout";
import { getSiteSettings } from "@/lib/cms";
import {
  GraduationCap,
  FileText,
  Users,
  Award,
  ArrowRight,
  Shield,
  BarChart3,
  ClipboardCheck,
  Leaf,
  BookOpen,
  IndianRupee,
} from "lucide-react";

export default async function HomePage() {
  const settings = await getSiteSettings();

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 px-6 py-20 text-white md:py-28">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur">
            <Leaf className="h-4 w-4 text-gold" />
            Fellowship Programme 2026
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl md:text-6xl">
            {settings.heroTitle || "VGMF Research Fellowship 2026"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/85">
            {settings.heroSubtitle ||
              "Apply for research fellowships in Ayurvedic medicine with grants up to ₹75,000."}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/register" className="btn-gold inline-flex items-center gap-2 px-8 py-3">
              Start Application
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-8 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <NoticesSection />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="section-title text-center">Programme Highlights</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted">
          Clinical research, protocol development, and evidence-based Viddhakarma studies
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BookOpen, title: "Research Grants", desc: "Up to ₹75,000 for approved proposals" },
            { icon: Users, title: "Expert Review", desc: "Review committee scoring and mentorship" },
            { icon: FileText, title: "Custom Forms", desc: "Admin-configurable application fields" },
            { icon: IndianRupee, title: "Fund Disbursement", desc: "40/40/20 installment tracking" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card text-center transition hover:-translate-y-1 hover:shadow-lg">
                <div className="mx-auto inline-flex rounded-2xl bg-primary-50 p-4 text-primary-600">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-4 font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="portals" className="bg-[#f4faf7] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="section-title text-center">Portal Access</h2>
          <p className="mt-3 text-center text-muted">
            Dedicated secure portals for every stakeholder
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Applicant", desc: "Register, apply, track status", icon: GraduationCap, href: "/register", color: "bg-white text-primary-600" },
              { title: "Admin", desc: "CMS, forms, applications", icon: Shield, href: "/login", color: "bg-white text-purple-600" },
              { title: "Staff", desc: "Finance & operations", icon: BarChart3, href: "/login", color: "bg-white text-blue-600" },
              { title: "Reviewer", desc: "Score & shortlist", icon: ClipboardCheck, href: "/login", color: "bg-white text-orange-600" },
            ].map((portal) => {
              const Icon = portal.icon;
              return (
                <Link key={portal.title} href={portal.href} className="card group transition hover:border-primary-300 hover:shadow-lg">
                  <div className={`inline-flex rounded-2xl p-3 shadow-sm ${portal.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-ink group-hover:text-primary-600">
                    {portal.title} Portal
                  </h3>
                  <p className="mt-2 text-sm text-muted">{portal.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="section-title text-center">Application Process</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            { step: "1", title: "Register & Verify", desc: "Create account with WhatsApp OTP verification", icon: GraduationCap },
            { step: "2", title: "Submit Application", desc: "Complete fellowship form and upload documents", icon: FileText },
            { step: "3", title: "Review & Award", desc: "Reviewer scoring, interview, and fellowship grant", icon: Award },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="card relative text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white shadow-md">
                  {item.step}
                </div>
                <Icon className="mx-auto mt-4 h-8 w-8 text-primary-600" />
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[#e8e2d6] bg-gold-soft/40 px-6 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl font-bold text-ink">About the Foundation</h2>
          <p className="mt-4 text-ink-soft leading-relaxed">
            The Vaidya Gogate Memorial Foundation has been advancing Ayurvedic education and research since 1972.
            Our 2026 Fellowship Programme empowers practitioners to contribute meaningful research in Viddhakarma and allied sciences.
          </p>
          <Link href="/about" className="btn-primary mt-6 inline-flex">
            Learn More
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
