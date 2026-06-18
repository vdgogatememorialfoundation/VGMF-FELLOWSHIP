"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { NavLink } from "@/lib/site-content";

interface MobileNavProps {
  links: NavLink[];
  signupEnabled?: boolean;
}

export function MobileNav({ links, signupEnabled = true }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const menu = open ? (
    <div
      className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      onClick={() => setOpen(false)}
    >
      <div
        className="absolute right-0 top-0 flex h-full w-[min(100%,320px)] flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e4ede8] p-6 pb-4">
          <p className="font-display text-lg font-bold text-ink">Menu</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl p-2 hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-6 pt-4">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-2xl px-4 py-3 text-sm font-semibold text-ink-soft hover:bg-primary-50 hover:text-primary-700"
            >
              {item.label}
            </Link>
          ))}
          {signupEnabled && (
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="btn-primary mt-4 text-center"
            >
              Apply Now
            </Link>
          )}
        </nav>
      </div>
    </div>
  ) : null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="rounded-2xl border border-[#dce8e2] p-2.5 text-ink-soft"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
