"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export default function AdminCmsPage() {
  const [settings, setSettings] = useState({
    siteName: "",
    siteTagline: "",
    tickerText: "",
    tickerEnabled: true,
    heroTitle: "",
    heroSubtitle: "",
    footerText: "",
    contactEmail: "",
    contactPhone: "",
    logoUrl: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/cms")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
      });
  }, []);

  async function saveSettings() {
    setLoading(true);
    const res = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "settings", data: settings }),
    });
    setLoading(false);
    setMessage(res.ok ? "Site settings saved!" : "Failed to save");
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("logo", file);
    const res = await fetch("/api/admin/cms", { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok) {
      setSettings((s) => ({ ...s, logoUrl: data.logoUrl }));
      setMessage("Logo uploaded!");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <p className="text-gray-600">Manage logo, branding, ticker, and contact info</p>
      </div>

      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}

      <div className="card space-y-4">
        <h2 className="font-semibold">Logo</h2>
        {settings.logoUrl && (
          <img src={settings.logoUrl} alt="Logo" className="h-16 object-contain" />
        )}
        <input type="file" accept="image/*" onChange={uploadLogo} className="text-sm" />
      </div>

      <div className="card space-y-4">
        <Input
          label="Site Name"
          value={settings.siteName}
          onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
        />
        <Input
          label="Site Tagline"
          value={settings.siteTagline || ""}
          onChange={(e) => setSettings({ ...settings, siteTagline: e.target.value })}
        />
        <Input
          label="Hero Title"
          value={settings.heroTitle || ""}
          onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
        />
        <Textarea
          label="Hero Subtitle"
          value={settings.heroSubtitle || ""}
          onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
        />
        <Textarea
          label="Announcement Ticker Text"
          value={settings.tickerText || ""}
          onChange={(e) => setSettings({ ...settings, tickerText: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.tickerEnabled}
            onChange={(e) => setSettings({ ...settings, tickerEnabled: e.target.checked })}
          />
          Enable announcement ticker
        </label>
        <Textarea
          label="Footer Text"
          value={settings.footerText || ""}
          onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Contact Email"
            value={settings.contactEmail || ""}
            onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
          />
          <Input
            label="Contact Phone"
            value={settings.contactPhone || ""}
            onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
          />
        </div>
        <Button onClick={saveSettings} loading={loading}>Save Settings</Button>
      </div>
    </div>
  );
}
