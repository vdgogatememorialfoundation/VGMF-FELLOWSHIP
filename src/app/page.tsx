import { PublicHeader, PublicFooter, NoticesSection } from "@/components/public/PublicLayout";
import { getSiteSettings } from "@/lib/cms";
import Link from "next/link";
import {
  GraduationCap,
  FileText,
  Users,
  Award,
  ArrowRight,
  Shield,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";

export default async function HomePage() {
  const settings = await getSiteSettings();

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <section className="bg-gradient-to-br from-primary-600 to-primary-800 px-6 py-24 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            {settings.heroTitle || "VGMF Research Fellowship 2026"}
          </h1>
          <p className="mt-6 text-lg text-primary-100">
            {settings.heroSubtitle ||
              "Apply for research fellowships in Ayurvedic medicine with grants up to ₹75,000."}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
            >
              Start Application
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Applicant Login
            </Link>
          </div>
        </div>
      </section>

      <NoticesSection />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-gray-900">Portal Access</h2>
        <p className="mt-3 text-center text-gray-600">
          Dedicated portals for every stakeholder in the fellowship process
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Applicant Portal",
              desc: "Register, apply, upload documents, track status",
              icon: GraduationCap,
              href: "/register",
              color: "bg-blue-50 text-blue-600",
            },
            {
              title: "Admin Portal",
              desc: "Manage site, forms, notices, applications",
              icon: Shield,
              href: "/admin",
              color: "bg-purple-50 text-purple-600",
            },
            {
              title: "Staff Portal",
              desc: "Finance tracking, fund disbursement, reports",
              icon: BarChart3,
              href: "/staff",
              color: "bg-green-50 text-green-600",
            },
            {
              title: "Reviewer Portal",
              desc: "Score applications, shortlist candidates",
              icon: ClipboardCheck,
              href: "/reviewer",
              color: "bg-orange-50 text-orange-600",
            },
          ].map((portal) => {
            const Icon = portal.icon;
            return (
              <Link
                key={portal.title}
                href={portal.href}
                className="card group transition hover:border-primary-300 hover:shadow-md"
              >
                <div className={`inline-flex rounded-lg p-3 ${portal.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-primary-700">
                  {portal.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{portal.desc}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-gray-100 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-gray-900">Application Process</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Register & Apply",
                desc: "Create your account, complete the fellowship form, submit research proposal",
                icon: FileText,
              },
              {
                step: "2",
                title: "Review & Interview",
                desc: "Reviewers evaluate your proposal, shortlisted candidates are interviewed",
                icon: Users,
              },
              {
                step: "3",
                title: "Fellowship Award",
                desc: "Selected fellows receive grant, progress tracking, and completion certificate",
                icon: Award,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="card text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                    {item.step}
                  </div>
                  <Icon className="mx-auto mt-4 h-8 w-8 text-primary-600" />
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
