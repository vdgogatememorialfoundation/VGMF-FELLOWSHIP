import {
  IndianRupee,
  Users,
  MessageCircle,
  Activity,
  GraduationCap,
  Wallet,
} from "lucide-react";

const BENTO = [
  {
    icon: IndianRupee,
    title: "Research grants",
    desc: "Up to ₹75,000 for approved Viddhakarma & Ayurveda research proposals.",
    accent: "from-primary-500 to-primary-700",
    span: "sm:col-span-2",
    emoji: "💰",
  },
  {
    icon: Users,
    title: "Expert review panel",
    desc: "100-mark scoring by senior reviewers & committee mentorship.",
    accent: "from-[#8b5cf6] to-[#6d28d9]",
    span: "",
    emoji: "🎯",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp verify",
    desc: "Quick OTP signup — no hassle, fully secure registration.",
    accent: "from-[#22c55e] to-[#16a34a]",
    span: "",
    emoji: "📱",
  },
  {
    icon: Activity,
    title: "Live status tracking",
    desc: "12-digit application number + dashboard updates at every stage.",
    accent: "from-[#0ea5e9] to-[#0284c7]",
    span: "",
    emoji: "📊",
  },
  {
    icon: GraduationCap,
    title: "Mentorship support",
    desc: "Guidance from foundation experts throughout your fellowship journey.",
    accent: "from-gold to-[#f59e0b]",
    span: "",
    emoji: "🌿",
  },
  {
    icon: Wallet,
    title: "Smart disbursement",
    desc: "40/40/20 fund release tied to milestones — transparent & tracked.",
    accent: "from-primary-600 to-primary-800",
    span: "sm:col-span-2",
    emoji: "✅",
  },
];

export function HomeBento() {
  return (
    <section id="highlights" className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary-600">
          Why apply
        </p>
        <h2 className="section-title mt-2 text-center">
          Fellowship <span className="gradient-text">perks</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted">
          Built for the next generation of Ayurvedic researchers — fast, transparent, and actually useful.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENTO.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className={`bento-card group ${item.span}`}>
                <div
                  className={`inline-flex rounded-2xl bg-gradient-to-br ${item.accent} p-3 text-white shadow-lg`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-4 text-2xl">{item.emoji}</p>
                <h3 className="mt-1 font-display text-lg font-extrabold text-ink group-hover:text-primary-700">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
