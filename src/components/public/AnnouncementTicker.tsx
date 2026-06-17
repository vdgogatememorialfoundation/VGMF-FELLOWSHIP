"use client";

export function AnnouncementTicker({ text }: { text: string }) {
  return (
    <div className="border-b border-primary-700/20 bg-primary-700 text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-2">
        <span className="shrink-0 rounded-md bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          Live
        </span>
        <div className="overflow-hidden flex-1">
          <div className="animate-marquee whitespace-nowrap text-sm font-medium">
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
          animation: marquee 28s linear infinite;
        }
      `}</style>
    </div>
  );
}
