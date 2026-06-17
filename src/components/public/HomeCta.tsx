import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

export function HomeCta() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-[2rem] border-2 border-primary-200 bg-gradient-to-br from-primary-50 via-white to-gold-soft p-8 text-center shadow-[0_24px_80px_rgba(27,107,82,0.12)] md:p-12">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-lime/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-gold/20 blur-2xl" />

          <Leaf className="mx-auto h-10 w-10 text-primary-600" />
          <h2 className="mt-4 font-display text-2xl font-extrabold text-ink md:text-4xl">
            Ready to research something that matters?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted">
            Join the 2026 cohort. Apply in minutes, track everything, and build evidence-based Ayurveda for the future.
          </p>
          <Link href="/register" className="btn-primary mt-8 inline-flex gap-2 px-8 py-3.5 text-base">
            Apply for Fellowship 2026
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomeAbout() {
  return (
    <section className="border-y border-primary-100 bg-white px-6 py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 md:flex-row md:items-start">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600">Since 1972</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-ink md:text-4xl">
            Advancing Ayurveda through real research
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            The Vaidya Gogate Memorial Foundation empowers practitioners to contribute meaningful
            research in Viddhakarma and allied sciences — with grants, mentorship, and a transparent
            review process built for 2026.
          </p>
          <Link href="/about" className="btn-secondary mt-6 inline-flex">
            About the foundation
          </Link>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3">
          {[
            { n: "50+", l: "Years of legacy" },
            { n: "₹75K", l: "Grant ceiling" },
            { n: "100", l: "Mark review system" },
            { n: "OTP", l: "Secure signup" },
          ].map((item) => (
            <div
              key={item.l}
              className="rounded-2xl border border-primary-100 bg-primary-50/50 p-5 text-center"
            >
              <p className="font-display text-2xl font-extrabold text-primary-700">{item.n}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{item.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
