"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

interface Notice {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  priority: number;
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [form, setForm] = useState({ title: "", content: "", priority: 0 });
  const [message, setMessage] = useState("");

  function load() {
    fetch("/api/admin/cms")
      .then((r) => r.json())
      .then((d) => setNotices(d.notices || []));
  }

  useEffect(() => { load(); }, []);

  async function createNotice() {
    const res = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "notice",
        data: { ...form, isActive: true },
      }),
    });
    if (res.ok) {
      setForm({ title: "", content: "", priority: 0 });
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
        <p className="text-gray-600">Manage notices shown on the homepage</p>
      </div>

      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}

      <div className="card space-y-4">
        <h2 className="font-semibold">Add New Notice</h2>
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Textarea
          label="Content"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />
        <Input
          label="Priority (higher = top)"
          type="number"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
        />
        <Button onClick={createNotice}>Publish Notice</Button>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">All Notices</h2>
        <div className="space-y-3">
          {notices.map((n) => (
            <div key={n.id} className="flex items-start justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{n.content}</p>
                <span className={`mt-2 inline-block text-xs ${n.isActive ? "text-green-600" : "text-gray-400"}`}>
                  {n.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="text-xs" onClick={() => toggleNotice(n.id, n.isActive)}>
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
