"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/#highlights", label: "Highlights" },
  { href: "/#notices", label: "Notices" },
  { href: "/#apply", label: "Apply" },
  { href: "/#faq", label: "FAQ" },
  { href: "/about", label: "Foundation" },
  { href: "/#contact", label: "Contact" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="rounded-2xl border border-[#dce8e2] p-2.5 text-ink-soft"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-[min(100%,320px)] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold text-ink">Menu</p>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-ink-soft hover:bg-primary-50 hover:text-primary-700"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="btn-primary mt-4 text-center"
              >
                Apply Now
              </Link>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
