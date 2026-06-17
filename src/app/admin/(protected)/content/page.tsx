"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const PAGE_SLUGS = [
  { slug: "ABOUT", label: "About Us", route: "/about" },
  { slug: "TERMS", label: "Terms & Conditions", route: "/terms" },
  { slug: "PRIVACY", label: "Privacy Policy", route: "/privacy" },
  { slug: "REFUND", label: "Refund Policy", route: "/refund-policy" },
];

export default function AdminContentPage() {
  const [pages, setPages] = useState<Record<string, { title: string; content: string }>>({});
  const [active, setActive] = useState("ABOUT");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/cms")
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, { title: string; content: string }> = {};
        d.pages?.forEach((p: { slug: string; title: string; content: string }) => {
          map[p.slug] = { title: p.title, content: p.content };
        });
        PAGE_SLUGS.forEach((p) => {
          if (!map[p.slug]) map[p.slug] = { title: p.label, content: "" };
        });
        setPages(map);
      });
  }, []);

  async function savePage() {
    setLoading(true);
    const page = pages[active];
    const res = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "page",
        data: { slug: active, title: page.title, content: page.content },
      }),
    });
    setLoading(false);
    setMessage(res.ok ? "Page saved!" : "Failed to save");
  }

  const current = pages[active] || { title: "", content: "" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Pages</h1>
        <p className="text-gray-600">Edit About Us, Terms, Privacy, and Refund Policy</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PAGE_SLUGS.map((p) => (
          <button
            key={p.slug}
            onClick={() => setActive(p.slug)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              active === p.slug ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}

      <div className="card space-y-4">
        <Input
          label="Page Title"
          value={current.title}
          onChange={(e) =>
            setPages({ ...pages, [active]: { ...current, title: e.target.value } })
          }
        />
        <Textarea
          label="Page Content"
          rows={16}
          value={current.content}
          onChange={(e) =>
            setPages({ ...pages, [active]: { ...current, content: e.target.value } })
          }
        />
        <p className="text-xs text-gray-500">
          Public URL: {PAGE_SLUGS.find((p) => p.slug === active)?.route}
        </p>
        <Button onClick={savePage} loading={loading}>Save Page</Button>
      </div>
    </div>
  );
}
