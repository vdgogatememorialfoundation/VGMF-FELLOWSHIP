import { GraduationCap, FileText, Award, ArrowRight } from "lucide-react";

const STEPS = [
  {
    step: "01",
    title: "Register & verify",
    desc: "Create your account with WhatsApp OTP. Get your unique User ID instantly.",
    icon: GraduationCap,
    color: "bg-primary-500",
  },
  {
    step: "02",
    title: "Submit application",
    desc: "Fill the fellowship form, upload documents, and receive your 12-digit tracking number.",
    icon: FileText,
    color: "bg-[#8b5cf6]",
  },
  {
    step: "03",
    title: "Review & award",
    desc: "Reviewer scoring, interview round, and fellowship grant with installment disbursement.",
    icon: Award,
    color: "bg-gold",
  },
];

export function HomeTimeline() {
  return (
    <section id="process" className="dark-section px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-neon">
          3 simple steps
        </p>
        <h2 className="mt-2 text-center font-display text-3xl font-extrabold tracking-tight text-white md:text-5xl">
          How it works
        </h2>

        <div className="relative mt-14 grid gap-8 md:grid-cols-3">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-10 hidden h-0.5 bg-gradient-to-r from-primary-400 via-lime to-gold md:block" />

          {STEPS.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="relative text-center">
                <div
                  className={`relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${item.color} font-display text-lg font-extrabold text-ink shadow-xl`}
                >
                  {item.step}
                </div>
                <Icon className="mx-auto mt-5 h-8 w-8 text-neon" />
                <h3 className="mt-4 font-display text-xl font-extrabold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{item.desc}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="mx-auto mt-4 h-5 w-5 text-white/30 md:hidden" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
