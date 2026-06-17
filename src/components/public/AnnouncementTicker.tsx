"use client";

export function AnnouncementTicker({ text }: { text: string }) {
  return (
    <div className="border-b border-primary-800/30 bg-gradient-to-r from-[#0d3b2f] via-primary-700 to-[#145a47] text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-2">
        <span className="shrink-0 rounded-lg bg-gradient-to-r from-gold to-[#f59e0b] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-ink">
          Live ✦
        </span>
        <div className="overflow-hidden flex-1">
          <div className="animate-marquee whitespace-nowrap text-sm font-semibold">
            <span className="mx-8 inline-block">{text}</span>
            <span className="mx-8 inline-block">{text}</span>
            <span className="mx-8 inline-block">{text}</span>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 24s linear infinite;
        }
      `}</style>
    </div>
  );
}
