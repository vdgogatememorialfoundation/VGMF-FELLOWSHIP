import Link from "next/link";
import { ArrowRight, Sparkles, Shield, BadgeCheck } from "lucide-react";

interface HomeHeroProps {
  title: string;
  subtitle: string;
}

export function HomeHero({ title, subtitle }: HomeHeroProps) {
  return (
    <section className="mesh-hero relative overflow-hidden px-6 pb-20 pt-16 text-white md:pb-28 md:pt-24">
      <div
        className="pointer-events-none absolute -left-10 top-20 h-40 w-40 rounded-full bg-lime/30 blur-3xl"
        style={{ animation: "pulse-glow 4s ease-in-out infinite" }}
      />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            Fellowship 2026 · Now Open
          </div>

          <h1 className="mt-6 max-w-4xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            {title}
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
            {subtitle}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link href="/register" className="btn-gold gap-2 px-8 py-3.5 text-base">
              Start your application
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/#process" className="btn-ghost-light text-base">
              See how it works
            </Link>
          </div>

          <div className="mt-10 grid w-full max-w-3xl grid-cols-3 gap-3 sm:gap-4">
            {[
              { value: "₹75K", label: "Max grant" },
              { value: "12-digit", label: "Tracking ID" },
              { value: "1972", label: "Legacy yrs" },
            ].map((stat) => (
              <div key={stat.label} className="stat-pill">
                <p className="font-display text-xl font-extrabold sm:text-2xl">{stat.value}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70 sm:text-xs">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-3">
          {[
            { icon: Shield, text: "Secure WhatsApp OTP signup" },
            { icon: BadgeCheck, text: "Expert reviewer scoring" },
            { icon: Sparkles, text: "Email confirmation on submit" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold backdrop-blur"
            >
              <Icon className="h-4 w-4 shrink-0 text-neon" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
