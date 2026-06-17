"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Foundation" },
  { href: "/#notices", label: "Notices" },
  { href: "/#highlights", label: "Perks" },
  { href: "/#process", label: "How it works" },
  { href: "/#contact", label: "Contact" },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-1 lg:flex">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-primary-50 hover:text-primary-700"
          >
            {link.label}
          </Link>
        ))}
        <Link href="/register" className="btn-primary ml-2 text-sm">
          Apply Now ✦
        </Link>
      </nav>

      <button
        type="button"
        className="rounded-xl border border-primary-100 p-2 lg:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full border-b border-primary-100 bg-white/95 px-6 py-4 shadow-lg backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-primary-50"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="btn-primary mt-2 justify-center"
            >
              Apply Now ✦
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
