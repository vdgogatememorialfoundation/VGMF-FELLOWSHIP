"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { NOTICE_CATEGORIES, getNoticeCategoryLabel } from "@/lib/notices";
import type { NoticeCategory } from "@/lib/notices";

interface Notice {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  linkUrl?: string | null;
  linkLabel?: string | null;
  isActive: boolean;
  priority: number;
  expiresAt?: string | null;
  publishedAt?: string;
}

const CATEGORY_OPTIONS = NOTICE_CATEGORIES.map((c) => ({
  value: c.value,
  label: c.label,
}));

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "EVENT" as NoticeCategory,
    priority: 0,
    linkUrl: "",
    linkLabel: "",
    expiresAt: "",
  });
  const [message, setMessage] = useState("");

  function load() {
    fetch("/api/admin/cms")
      .then((r) => r.json())
      .then((d) => setNotices(d.notices || []));
  }

  useEffect(() => {
    load();
  }, []);

  async function createNotice() {
    const res = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "notice",
        data: {
          title: form.title,
          content: form.content,
          category: form.category,
          priority: form.priority,
          linkUrl: form.linkUrl || null,
          linkLabel: form.linkLabel || null,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
          isActive: true,
        },
      }),
    });
    if (res.ok) {
      setForm({
        title: "",
        content: "",
        category: "EVENT",
        priority: 0,
        linkUrl: "",
        linkLabel: "",
        expiresAt: "",
      });
      setMessage("Notice published!");
      load();
    }
  }

  async function toggleNotice(id: string, isActive: boolean) {
    await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "notice", data: { id, isActive: !isActive } }),
    });
    load();
  }

  async function deleteNotice(id: string) {
    await fetch(`/api/admin/cms?type=notice&id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notices & Announcements</h1>
        <p className="text-gray-600">
          Manage official notices on the homepage — categories, pins, links, and expiry
        </p>
      </div>

      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}

      <div className="card space-y-4">
        <h2 className="font-semibold">Add New Notice</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Select
            label="Category"
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as NoticeCategory })
            }
            options={CATEGORY_OPTIONS}
          />
        </div>
        <Textarea
          label="Content"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Priority (10+ = pinned on homepage)"
            type="number"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
          />
          <Input
            label="Expires on (optional)"
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
          <Input
            label="Link URL (optional, e.g. /register)"
            value={form.linkUrl}
            onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
          />
          <Input
            label="Link label (optional)"
            value={form.linkLabel}
            onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
            placeholder="Apply now"
          />
        </div>
        <Button onClick={createNotice}>Publish Notice</Button>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">All Notices</h2>
        <div className="space-y-3">
          {notices.map((n) => (
            <div key={n.id} className="flex items-start justify-between rounded-lg border p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{n.title}</p>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {getNoticeCategoryLabel(n.category ?? "GENERAL")}
                  </span>
                  {n.priority >= 10 && (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-medium text-[#9a7b1a]">
                      Pinned
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{n.content}</p>
                <span
                  className={`mt-2 inline-block text-xs ${n.isActive ? "text-green-600" : "text-gray-400"}`}
                >
                  {n.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="text-xs"
                  onClick={() => toggleNotice(n.id, n.isActive)}
                >
                  {n.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="danger" className="text-xs" onClick={() => deleteNotice(n.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {notices.length === 0 && (
            <p className="text-center text-gray-500 py-4">No notices yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
