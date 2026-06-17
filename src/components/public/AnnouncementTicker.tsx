"use client";

export function AnnouncementTicker({ text }: { text: string }) {
  return (
    <div className="border-b border-primary-800/30 bg-gradient-to-r from-primary-800 via-primary-700 to-primary-800 text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-2 sm:px-6">
        <span className="relative shrink-0 rounded-lg bg-gold px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white shadow">
          <span className="absolute -left-0.5 -top-0.5 h-2 w-2 animate-ping rounded-full bg-lime-pop opacity-75" />
          Live
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
          animation: marquee 26s linear infinite;
        }
      `}</style>
    </div>
  );
}
