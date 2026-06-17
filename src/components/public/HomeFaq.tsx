"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Who can apply for the fellowship?",
    a: "BAMS graduates and Ayurvedic practitioners with a strong research proposal in Viddhakarma or allied Ayurvedic sciences can apply.",
  },
  {
    q: "How do I track my application?",
    a: "After submission you receive a 12-digit application number by email. Track status anytime from your applicant dashboard.",
  },
  {
    q: "What is the grant amount?",
    a: "Selected fellows can receive research grants up to ₹75,000, disbursed in structured installments after approval milestones.",
  },
  {
    q: "Is WhatsApp verification required?",
    a: "Yes — registration uses WhatsApp OTP to verify your mobile number and keep your account secure.",
  },
];

export function HomeFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary-600">
          Got questions?
        </p>
        <h2 className="section-title mt-2 text-center">Quick answers</h2>
        <div className="mt-8 space-y-3">
          {FAQS.map((item, i) => (
            <div
              key={item.q}
              className="overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-bold text-ink">{item.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-primary-600 transition ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <p className="border-t border-primary-50 px-5 py-4 text-sm leading-relaxed text-muted">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
