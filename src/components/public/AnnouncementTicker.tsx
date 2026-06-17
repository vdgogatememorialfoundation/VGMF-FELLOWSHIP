"use client";

export function AnnouncementTicker({ text }: { text: string }) {
  return (
    <div className="overflow-hidden bg-primary-700 text-white">
      <div className="animate-marquee whitespace-nowrap py-2 text-sm font-medium">
        <span className="mx-8 inline-block">{text}</span>
        <span className="mx-8 inline-block">{text}</span>
        <span className="mx-8 inline-block">{text}</span>
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 25s linear infinite;
        }
      `}</style>
    </div>
  );
}
