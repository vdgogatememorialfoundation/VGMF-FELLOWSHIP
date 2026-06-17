import Link from "next/link";
import {
  GraduationCap,
  FileText,
  Users,
  Award,
  ArrowRight,
  Shield,
  BarChart3,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-lg font-bold text-white">
              V
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">VGMF Fellowship Portal</p>
              <p className="text-xs text-gray-500">Viddhakarma Global Medical Foundation</p>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link href="/register" className="btn-primary">
              Apply Now
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-br from-primary-600 to-primary-800 px-6 py-24 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Viddhakarma Research Fellowship
          </h1>
          <p className="mt-6 text-lg text-primary-100">
            Apply for research fellowships in Ayurvedic medicine. Support for clinical research,
            protocol development, and evidence-based Viddhakarma studies up to ₹75,000.
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
              desc: "Manage applications, review documents, update status",
              icon: Shield,
              href: "/login",
              color: "bg-purple-50 text-purple-600",
            },
            {
              title: "Staff Portal",
              desc: "Finance tracking, fund disbursement, reports",
              icon: BarChart3,
              href: "/login",
              color: "bg-green-50 text-green-600",
            },
            {
              title: "Committee Portal",
              desc: "Score applications, shortlist candidates",
              icon: Users,
              href: "/login",
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
                desc: "Create your account, fill personal & professional details, submit research proposal",
                icon: FileText,
              },
              {
                step: "2",
                title: "Review & Interview",
                desc: "Committee reviews your proposal, scores applications, shortlisted candidates are interviewed",
                icon: Users,
              },
              {
                step: "3",
                title: "Fellowship Award",
                desc: "Selected fellows receive grant, quarterly progress tracking, and completion certificate",
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

      <footer className="border-t border-gray-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-7xl text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Viddhakarma Global Medical Foundation. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
