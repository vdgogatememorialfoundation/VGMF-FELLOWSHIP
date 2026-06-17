"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "Who can apply for the VGMF Fellowship 2026?",
    a: "Practitioners with BAMS and relevant clinical or research background can register, complete the fellowship application, and submit proposals in Viddhakarma and allied Ayurvedic research areas.",
  },
  {
    q: "What is the grant amount?",
    a: "Selected fellows can receive research grants up to ₹75,000, disbursed in structured installments after approval and milestone reviews.",
  },
  {
    q: "How do I track my application?",
    a: "After submission you receive a 12-digit application number by email. Use it on your applicant dashboard to track status, notices, and reviewer updates.",
  },
  {
    q: "What documents are required?",
    a: "Applicants typically submit proposal details, professional credentials, and supporting documents as listed in the application form. Admin may request resubmission if needed.",
  },
  {
    q: "How does the review process work?",
    a: "Applications move through review, shortlisting, interview (if applicable), and final selection. Reviewers score proposals and trustees approve fellowship awards.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="section-badge">Got questions?</span>
          <h2 className="section-title mt-4">Frequently asked questions</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Registration, applications, grants, and tracking — answered.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-[#e4ede8] bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-display text-sm font-bold text-ink sm:text-base">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-primary-600 transition ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#f0f4f2] px-5 pb-4 pt-2 text-sm leading-relaxed text-ink-soft">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
