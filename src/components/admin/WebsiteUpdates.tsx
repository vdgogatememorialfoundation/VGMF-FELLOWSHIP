"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { NOTICE_CATEGORIES, getNoticeCategoryLabel } from "@/lib/notices";
import type { NoticeCategory } from "@/lib/notices";
import type { NavLink, FaqItem, HeroStat, SnapshotItem, HighlightTile, JourneyStep } from "@/lib/site-content";
import type { NotificationEventTemplate } from "@/lib/notification-templates";
import { IntegrationsSettingsPanel } from "@/components/admin/IntegrationsSettingsPanel";
import { SeoSettingsPanel } from "@/components/admin/SeoSettingsPanel";

const TABS = [
  { id: "branding", label: "Branding" },
  { id: "seo", label: "SEO & Google" },
  { id: "access", label: "Signup & Login" },
  { id: "header", label: "Header & Nav" },
  { id: "footer", label: "Footer" },
  { id: "homepage", label: "Homepage" },
  { id: "faq", label: "FAQ" },
  { id: "announcements", label: "Ticker" },
  { id: "notices", label: "Notices" },
  { id: "pages", label: "Content Pages" },
  { id: "integrations", label: "API Settings" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PAGE_SLUGS = [
  { slug: "ABOUT", label: "About Us", route: "/about" },
  { slug: "TERMS", label: "Terms & Conditions", route: "/terms" },
  { slug: "UNDERTAKING", label: "Applicant Undertaking", route: "/undertaking" },
  { slug: "RULEBOOK", label: "Fellowship Rulebook", route: "/rulebook" },
  { slug: "PRIVACY", label: "Privacy Policy", route: "/privacy" },
  { slug: "REFUND", label: "Refund Policy", route: "/refund-policy" },
];

interface SiteSettingsState {
  siteName?: string;
  siteTagline?: string;
  logoUrl?: string;
  faviconUrl?: string;
  headerOrgName?: string;
  utilityBarText?: string;
  tickerText?: string;
  tickerEnabled?: boolean;
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadge?: string;
  heroStats?: HeroStat[];
  heroSnapshot?: SnapshotItem[];
  highlightsTitle?: string;
  highlightsSubtitle?: string;
  highlights?: HighlightTile[];
  journeyTitle?: string;
  journeySubtitle?: string;
  journeySteps?: JourneyStep[];
  aboutBadge?: string;
  aboutTitle?: string;
  aboutContent?: string;
  aboutCtaLabel?: string;
  aboutCtaHref?: string;
  faqTitle?: string;
  faqSubtitle?: string;
  faqItems?: FaqItem[];
  navLinks?: NavLink[];
  footerQuickLinks?: NavLink[];
  footerLegalLinks?: NavLink[];
  footerAboutText?: string;
  footerDeveloperCredit?: string;
  footerText?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  signupEnabled?: boolean;
  loginEnabled?: boolean;
  signupDisabledMessage?: string;
  loginDisabledMessage?: string;
  signupOtpEmailEnabled?: boolean;
  signupOtpWhatsappEnabled?: boolean;
  signupPasswordEnabled?: boolean;
  loginPasswordEnabled?: boolean;
  loginOtpWhatsappEnabled?: boolean;
  loginOtpEmailEnabled?: boolean;
  applicationNotifyEmailEnabled?: boolean;
  applicationNotifyWhatsappEnabled?: boolean;
  welcomeEmailEnabled?: boolean;
  welcomeWhatsappEnabled?: boolean;
  alertsEmailEnabled?: boolean;
  alertsWhatsappEnabled?: boolean;
  statusNotifyEmailEnabled?: boolean;
  statusNotifyWhatsappEnabled?: boolean;
  maintenanceModeEnabled?: boolean;
  maintenanceMessage?: string;
  maintenanceAllowPortals?: boolean;
  seoMetaTitle?: string;
  seoMetaDescription?: string;
  seoKeywords?: string;
  googleSiteVerification?: string;
  googleAnalyticsId?: string;
  seoIndexingEnabled?: boolean;
  seoStructuredDataEnabled?: boolean;
  publicSiteUrl?: string;
}

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
  hasAttachment?: boolean;
  attachmentUrl?: string | null;
  attachmentFileName?: string | null;
}

interface Integrations {
  appUrl: string;
  zeptomailToken: string;
  zeptomailFromEmail: string;
  zeptomailFromName: string;
  whatsappToken: string;
  whatsappPhoneNumberId: string;
  whatsappOtpTemplateName: string;
  whatsappOtpTemplateLanguage: string;
  whatsappApiVersion: string;
  whatsappBusinessAccountId: string;
  whatsappWebhookVerifyToken: string;
  emailOtpSubject: string;
  whatsappWebhookUrl?: string;
  notificationTemplates: NotificationEventTemplate[];
  digioClientId: string;
  digioClientSecret: string;
  digioWebhookSecret: string;
  digioTemplateIdentity: string;
  digioTemplateBank: string;
  digioTemplateUndertaking: string;
  digioEnvironment: string;
  digioRequireIdentityForScrutiny: boolean;
  digioEnabled: boolean;
  status: {
    emailConfigured: boolean;
    whatsappConfigured: boolean;
    digioConfigured: boolean;
    emailSource: string;
    whatsappSource: string;
    digioSource: string;
  };
}

function LinkListEditor({
  label,
  links,
  onChange,
}: {
  label: string;
  links: NavLink[];
  onChange: (links: NavLink[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-800">{label}</p>
      {links.map((link, index) => (
        <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            label="Label"
            value={link.label}
            onChange={(e) => {
              const next = [...links];
              next[index] = { ...link, label: e.target.value };
              onChange(next);
            }}
          />
          <Input
            label="URL"
            value={link.href}
            onChange={(e) => {
              const next = [...links];
              next[index] = { ...link, href: e.target.value };
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="danger"
            className="self-end"
            onClick={() => onChange(links.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...links, { label: "New link", href: "/" }])}
      >
        Add link
      </Button>
    </div>
  );
}

export function WebsiteUpdates() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") as TabId) || "branding";

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState<SiteSettingsState>({});
  const [pages, setPages] = useState<Record<string, { title: string; content: string; isPublished?: boolean }>>({});
  const [activePage, setActivePage] = useState("ABOUT");
  const [notices, setNotices] = useState<Notice[]>([]);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);

  const [noticeForm, setNoticeForm] = useState({
    title: "",
    content: "",
    category: "EVENT" as NoticeCategory,
    priority: 0,
    linkUrl: "",
    linkLabel: "",
    expiresAt: "",
    notifyApplicants: false,
  });
  const [noticeFile, setNoticeFile] = useState<File | null>(null);
  const [noticeFileKey, setNoticeFileKey] = useState(0);

  const [testPhone, setTestPhone] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/cms")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
        if (d.integrations) {
          setIntegrations({
            ...d.integrations,
            zeptomailToken: "",
            whatsappToken: "",
            digioClientId: "",
            digioClientSecret: "",
            digioWebhookSecret: "",
          });
        }

        const map: Record<string, { title: string; content: string; isPublished?: boolean }> = {};
        d.pages?.forEach((p: { slug: string; title: string; content: string; isPublished?: boolean }) => {
          map[p.slug] = { title: p.title, content: p.content, isPublished: p.isPublished };
        });
        PAGE_SLUGS.forEach((p) => {
          if (!map[p.slug]) map[p.slug] = { title: p.label, content: "" };
        });
        setPages(map);
        setNotices(d.notices || []);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setTab(tab: TabId) {
    router.push(`/admin/website?tab=${tab}`);
  }

  async function saveIntegrations() {
    if (!integrations) return;

    setLoading(true);
    setError("");
    setMessage("");

    const settingsRes = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "settings",
        data: {
          signupOtpEmailEnabled: settings.signupOtpEmailEnabled,
          signupOtpWhatsappEnabled: settings.signupOtpWhatsappEnabled,
          signupPasswordEnabled: settings.signupPasswordEnabled,
          loginPasswordEnabled: settings.loginPasswordEnabled,
          loginOtpWhatsappEnabled: settings.loginOtpWhatsappEnabled,
          loginOtpEmailEnabled: settings.loginOtpEmailEnabled,
          applicationNotifyEmailEnabled: settings.applicationNotifyEmailEnabled,
          applicationNotifyWhatsappEnabled: settings.applicationNotifyWhatsappEnabled,
          welcomeEmailEnabled: settings.welcomeEmailEnabled,
          welcomeWhatsappEnabled: settings.welcomeWhatsappEnabled,
          alertsEmailEnabled: settings.alertsEmailEnabled,
          alertsWhatsappEnabled: settings.alertsWhatsappEnabled,
          statusNotifyEmailEnabled: settings.statusNotifyEmailEnabled,
          statusNotifyWhatsappEnabled: settings.statusNotifyWhatsappEnabled,
        },
      }),
    });

    const integrationsRes = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "integrations",
        data: {
          ...integrations,
          zeptomailToken: integrations.zeptomailToken.trim() || undefined,
          whatsappToken: integrations.whatsappToken.trim() || undefined,
          whatsappWebhookVerifyToken: integrations.whatsappWebhookVerifyToken.trim() || undefined,
          digioClientId: integrations.digioClientId.trim() || undefined,
          digioClientSecret: integrations.digioClientSecret.trim() || undefined,
          digioWebhookSecret: integrations.digioWebhookSecret.trim() || undefined,
        },
      }),
    });

    setLoading(false);

    if (!settingsRes.ok || !integrationsRes.ok) {
      const settingsData = await settingsRes.json().catch(() => ({}));
      const integrationsData = await integrationsRes.json().catch(() => ({}));
      setError(settingsData.error || integrationsData.error || "Failed to save settings");
      return;
    }

    setMessage("API and notification settings saved successfully!");
    load();
  }

  async function publishNotice() {
    if (!noticeForm.title.trim()) {
      setError("Notice title is required");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("section", "notice");
    formData.append("title", noticeForm.title.trim());
    formData.append("content", noticeForm.content.trim());
    formData.append("category", noticeForm.category);
    formData.append("priority", String(noticeForm.priority));
    formData.append("linkUrl", noticeForm.linkUrl.trim());
    formData.append("linkLabel", noticeForm.linkLabel.trim());
    formData.append("notifyApplicants", String(noticeForm.notifyApplicants));
    if (noticeForm.expiresAt) {
      formData.append("expiresAt", new Date(noticeForm.expiresAt).toISOString());
    }
    if (noticeFile) {
      formData.append("attachment", noticeFile);
    }

    const res = await fetch("/api/admin/cms", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to publish notice");
      return;
    }

    setMessage("Notice published successfully!");
    setNoticeForm({
      title: "",
      content: "",
      category: "EVENT",
      priority: 0,
      linkUrl: "",
      linkLabel: "",
      expiresAt: "",
      notifyApplicants: false,
    });
    setNoticeFile(null);
    setNoticeFileKey((key) => key + 1);
    load();
  }

  async function saveSection(section: string, data: unknown) {
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, data }),
    });
    setLoading(false);
    if (res.ok) {
      setMessage("Saved successfully!");
      load();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to save");
    }
  }

  async function uploadAsset(field: "logo" | "favicon", file: File) {
    setError("");
    setMessage("");

    const maxBytes = field === "logo" ? 2 * 1024 * 1024 : 512 * 1024;
    if (file.size > maxBytes) {
      setError(
        `${field === "logo" ? "Logo" : "Favicon"} must be under ${field === "logo" ? "2MB" : "512KB"}.`
      );
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please upload a PNG, JPG, WebP, SVG, or GIF image.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append(field, file);
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      let data: { error?: string; logoUrl?: string; faviconUrl?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError("Upload failed. Please try a smaller image.");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setSettings((s) => ({
        ...s,
        logoUrl: data.logoUrl ?? s.logoUrl,
        faviconUrl: data.faviconUrl ?? s.faviconUrl,
      }));
      setMessage(`${field === "logo" ? "Logo" : "Favicon"} uploaded successfully!`);
      void load();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function testIntegration(type: "email" | "whatsapp") {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/integrations/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        target: type === "email" ? testEmail : testPhone,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setMessage(data.message);
    else setError(data.error);
  }

  const navLinks = settings.navLinks || [];
  const footerQuickLinks = settings.footerQuickLinks || [];
  const footerLegalLinks = settings.footerLegalLinks || [];
  const faqItems = settings.faqItems || [];
  const heroStats = settings.heroStats || [];
  const heroSnapshot = settings.heroSnapshot || [];
  const highlights = settings.highlights || [];
  const journeySteps = settings.journeySteps || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Website Updates</h1>
        <p className="text-gray-600">
          Manage all public website content, notices, pages, footer, header, and API integrations
        </p>
      </div>

      {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap gap-2 border-b pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === tab.id ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "branding" && (
        <div className="card space-y-4">
          <h2 className="font-semibold">Branding & General</h2>
          <p className="text-sm text-muted">
            Upload logo (max 2MB) and favicon (max 512KB). PNG or JPG recommended.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="mb-2 text-sm font-medium">Logo</p>
              {settings.logoUrl && (
                <img src={settings.logoUrl} alt="Logo preview" className="mb-3 h-16 object-contain" />
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                disabled={loading}
                onChange={(e) => e.target.files?.[0] && uploadAsset("logo", e.target.files[0])}
                className="text-sm"
              />
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="mb-2 text-sm font-medium">Favicon</p>
              {settings.faviconUrl && (
                <img src={settings.faviconUrl} alt="Favicon preview" className="mb-3 h-8 w-8 object-contain" />
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                disabled={loading}
                onChange={(e) => e.target.files?.[0] && uploadAsset("favicon", e.target.files[0])}
                className="text-sm"
              />
            </div>
          </div>
          <Input label="Site Name" value={settings.siteName || ""} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} />
          <Input label="Site Tagline" value={settings.siteTagline || ""} onChange={(e) => setSettings({ ...settings, siteTagline: e.target.value })} />
          <Input label="Header Organisation Name" value={settings.headerOrgName || ""} onChange={(e) => setSettings({ ...settings, headerOrgName: e.target.value })} />
          <Input label="Utility Bar Text" value={settings.utilityBarText || ""} onChange={(e) => setSettings({ ...settings, utilityBarText: e.target.value })} />
          <Input label="Contact Email" value={settings.contactEmail || ""} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} />
          <Input label="Contact Phone" value={settings.contactPhone || ""} onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })} />
          <Input label="Contact Address" value={settings.contactAddress || ""} onChange={(e) => setSettings({ ...settings, contactAddress: e.target.value })} />
          <p className="text-xs text-gray-500">
            Click Save Branding below after editing contact details — changes are stored in the database
            and will not reset on refresh once saved.
          </p>
          <Button loading={loading} onClick={() => saveSection("settings", settings)}>Save Branding</Button>
        </div>
      )}

      {activeTab === "seo" && (
        <SeoSettingsPanel
          settings={settings}
          integrationAppUrl={integrations?.appUrl}
          loading={loading}
          onChange={setSettings}
          onSave={() => saveSection("settings", settings)}
        />
      )}

      {activeTab === "access" && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <h2 className="font-semibold">Site Maintenance Mode</h2>
            <p className="text-sm text-gray-600">
              Show a maintenance page on the public website (homepage, content pages, and registration).
              Admin and staff portals remain accessible.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.maintenanceModeEnabled === true}
                onChange={(e) => setSettings({ ...settings, maintenanceModeEnabled: e.target.checked })}
              />
              Enable public site maintenance mode
            </label>
            <Textarea
              label="Maintenance message"
              value={settings.maintenanceMessage || ""}
              onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
              placeholder="The VGMF Fellowship Portal is undergoing scheduled maintenance..."
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.maintenanceAllowPortals !== false}
                onChange={(e) => setSettings({ ...settings, maintenanceAllowPortals: e.target.checked })}
              />
              Keep applicant portal accessible during maintenance
            </label>
            <p className="text-xs text-gray-500">
              Uncheck to block unauthenticated access to /applicant during maintenance.
            </p>
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">Applicant Signup & Login</h2>
            <p className="text-sm text-gray-600">
              Control public applicant registration and login. Admin, staff, reviewer, and trustee portals are not affected.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.signupEnabled !== false}
                onChange={(e) => setSettings({ ...settings, signupEnabled: e.target.checked })}
              />
              Enable applicant signup (public registration at /register)
            </label>
            <Textarea
              label="Message when signup is disabled"
              value={settings.signupDisabledMessage || ""}
              onChange={(e) => setSettings({ ...settings, signupDisabledMessage: e.target.value })}
              placeholder="New applicant registration is currently closed..."
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.loginEnabled !== false}
                onChange={(e) => setSettings({ ...settings, loginEnabled: e.target.checked })}
              />
              Enable applicant login (/applicant portal)
            </label>
            <Textarea
              label="Message when login is disabled"
              value={settings.loginDisabledMessage || ""}
              onChange={(e) => setSettings({ ...settings, loginDisabledMessage: e.target.value })}
              placeholder="Applicant login is temporarily unavailable..."
            />
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">Registration OTP Verification</h2>
            <p className="text-sm text-gray-600">
              WhatsApp OTP is enabled by default for signup. Email OTP is off by default. Disable both
              to allow direct registration without OTP (password optional below).
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.signupOtpWhatsappEnabled !== false}
                onChange={(e) => setSettings({ ...settings, signupOtpWhatsappEnabled: e.target.checked })}
              />
              Require WhatsApp OTP during signup
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.signupOtpEmailEnabled === true}
                onChange={(e) => setSettings({ ...settings, signupOtpEmailEnabled: e.target.checked })}
              />
              Require email OTP during signup (disabled by default)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.signupPasswordEnabled === true}
                onChange={(e) => setSettings({ ...settings, signupPasswordEnabled: e.target.checked })}
              />
              Require password during signup
            </label>
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">Applicant Login Methods</h2>
            <p className="text-sm text-gray-600">
              Applicant login uses WhatsApp OTP by default. Password login is optional. Staff and admin
              portals always use password login.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.loginOtpWhatsappEnabled !== false}
                onChange={(e) => setSettings({ ...settings, loginOtpWhatsappEnabled: e.target.checked })}
              />
              Enable WhatsApp OTP login for applicants
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.loginOtpEmailEnabled === true}
                onChange={(e) => setSettings({ ...settings, loginOtpEmailEnabled: e.target.checked })}
              />
              Enable email OTP login for applicants
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.loginPasswordEnabled === true}
                onChange={(e) => setSettings({ ...settings, loginPasswordEnabled: e.target.checked })}
              />
              Enable password login for applicants
            </label>
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">Status & Update Notifications</h2>
            <p className="text-sm text-gray-600">
              Email and WhatsApp alerts when application status changes, documents are reviewed,
              interviews are scheduled, installments are released, or site notices are broadcast.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.statusNotifyEmailEnabled !== false}
                onChange={(e) => setSettings({ ...settings, statusNotifyEmailEnabled: e.target.checked })}
              />
              Send status & update emails
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.statusNotifyWhatsappEnabled !== false}
                onChange={(e) => setSettings({ ...settings, statusNotifyWhatsappEnabled: e.target.checked })}
              />
              Send status & update WhatsApp messages
            </label>
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">General Portal Alerts</h2>
            <p className="text-sm text-gray-600">
              Control automated messages for welcome, application submission, and other portal alerts.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.welcomeEmailEnabled !== false}
                onChange={(e) => setSettings({ ...settings, welcomeEmailEnabled: e.target.checked })}
              />
              Send welcome email on registration (self-signup & admin-created applicants)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.welcomeWhatsappEnabled === true}
                onChange={(e) => setSettings({ ...settings, welcomeWhatsappEnabled: e.target.checked })}
              />
              Send welcome WhatsApp on registration
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.applicationNotifyEmailEnabled !== false}
                onChange={(e) => setSettings({ ...settings, applicationNotifyEmailEnabled: e.target.checked })}
              />
              Send application confirmation email (12-digit tracking number)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.applicationNotifyWhatsappEnabled !== false}
                onChange={(e) => setSettings({ ...settings, applicationNotifyWhatsappEnabled: e.target.checked })}
              />
              Send application confirmation WhatsApp
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.alertsEmailEnabled !== false}
                onChange={(e) => setSettings({ ...settings, alertsEmailEnabled: e.target.checked })}
              />
              Send general portal alert emails (support tickets, admin messages)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.alertsWhatsappEnabled !== false}
                onChange={(e) => setSettings({ ...settings, alertsWhatsappEnabled: e.target.checked })}
              />
              Send general portal alert WhatsApp messages
            </label>
          </div>

          <Button loading={loading} onClick={() => saveSection("settings", settings)}>
            Save Access & Notification Settings
          </Button>
        </div>
      )}

      {activeTab === "header" && (
        <div className="card space-y-4">
          <h2 className="font-semibold">Header Navigation</h2>
          <LinkListEditor label="Main navigation links" links={navLinks} onChange={(links) => setSettings({ ...settings, navLinks: links })} />
          <Button loading={loading} onClick={() => saveSection("settings", settings)}>Save Header</Button>
        </div>
      )}

      {activeTab === "footer" && (
        <div className="card space-y-4">
          <h2 className="font-semibold">Footer</h2>
          <Textarea label="Copyright / Footer Text" value={settings.footerText || ""} onChange={(e) => setSettings({ ...settings, footerText: e.target.value })} />
          <Input label="Footer About Text" value={settings.footerAboutText || ""} onChange={(e) => setSettings({ ...settings, footerAboutText: e.target.value })} />
          <Input label="Developer Credit Line" value={settings.footerDeveloperCredit || ""} onChange={(e) => setSettings({ ...settings, footerDeveloperCredit: e.target.value })} />
          <LinkListEditor label="Quick links" links={footerQuickLinks} onChange={(links) => setSettings({ ...settings, footerQuickLinks: links })} />
          <LinkListEditor label="Legal links" links={footerLegalLinks} onChange={(links) => setSettings({ ...settings, footerLegalLinks: links })} />
          <Button loading={loading} onClick={() => saveSection("settings", settings)}>Save Footer</Button>
        </div>
      )}

      {activeTab === "homepage" && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <h2 className="font-semibold">Hero Section</h2>
            <Input label="Hero Badge" value={settings.heroBadge || ""} onChange={(e) => setSettings({ ...settings, heroBadge: e.target.value })} />
            <Input label="Hero Title" value={settings.heroTitle || ""} onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })} />
            <Textarea label="Hero Subtitle" value={settings.heroSubtitle || ""} onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })} />
            {heroStats.map((stat, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-2">
                <Input label={`Stat ${i + 1} label`} value={stat.label} onChange={(e) => { const n = [...heroStats]; n[i] = { ...stat, label: e.target.value }; setSettings({ ...settings, heroStats: n }); }} />
                <Input label={`Stat ${i + 1} value`} value={stat.value} onChange={(e) => { const n = [...heroStats]; n[i] = { ...stat, value: e.target.value }; setSettings({ ...settings, heroStats: n }); }} />
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => setSettings({ ...settings, heroStats: [...heroStats, { label: "Label", value: "Value" }] })}>Add stat</Button>
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">Hero Snapshot Card</h2>
            {heroSnapshot.map((item, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <Input label="Title" value={item.title} onChange={(e) => { const n = [...heroSnapshot]; n[i] = { ...item, title: e.target.value }; setSettings({ ...settings, heroSnapshot: n }); }} />
                <Input label="Description" value={item.desc} onChange={(e) => { const n = [...heroSnapshot]; n[i] = { ...item, desc: e.target.value }; setSettings({ ...settings, heroSnapshot: n }); }} />
                <Input label="Icon (Lucide name)" value={item.icon} onChange={(e) => { const n = [...heroSnapshot]; n[i] = { ...item, icon: e.target.value }; setSettings({ ...settings, heroSnapshot: n }); }} />
              </div>
            ))}
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">Programme Highlights</h2>
            <Input label="Section Title" value={settings.highlightsTitle || ""} onChange={(e) => setSettings({ ...settings, highlightsTitle: e.target.value })} />
            <Textarea label="Section Subtitle" value={settings.highlightsSubtitle || ""} onChange={(e) => setSettings({ ...settings, highlightsSubtitle: e.target.value })} />
            {highlights.map((tile, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <Input label="Title" value={tile.title} onChange={(e) => { const n = [...highlights]; n[i] = { ...tile, title: e.target.value }; setSettings({ ...settings, highlights: n }); }} />
                <Textarea label="Description" value={tile.desc} onChange={(e) => { const n = [...highlights]; n[i] = { ...tile, desc: e.target.value }; setSettings({ ...settings, highlights: n }); }} />
                <Input label="Icon" value={tile.icon || ""} onChange={(e) => { const n = [...highlights]; n[i] = { ...tile, icon: e.target.value }; setSettings({ ...settings, highlights: n }); }} />
              </div>
            ))}
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">Application Journey</h2>
            <Input label="Section Badge" value={settings.journeySubtitle || ""} onChange={(e) => setSettings({ ...settings, journeySubtitle: e.target.value })} />
            <Input label="Section Title" value={settings.journeyTitle || ""} onChange={(e) => setSettings({ ...settings, journeyTitle: e.target.value })} />
            {journeySteps.map((step, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <Input label="Step number" value={step.step} onChange={(e) => { const n = [...journeySteps]; n[i] = { ...step, step: e.target.value }; setSettings({ ...settings, journeySteps: n }); }} />
                <Input label="Title" value={step.title} onChange={(e) => { const n = [...journeySteps]; n[i] = { ...step, title: e.target.value }; setSettings({ ...settings, journeySteps: n }); }} />
                <Textarea label="Description" value={step.desc} onChange={(e) => { const n = [...journeySteps]; n[i] = { ...step, desc: e.target.value }; setSettings({ ...settings, journeySteps: n }); }} />
              </div>
            ))}
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">About Section (Homepage)</h2>
            <Input label="Badge" value={settings.aboutBadge || ""} onChange={(e) => setSettings({ ...settings, aboutBadge: e.target.value })} />
            <Input label="Title" value={settings.aboutTitle || ""} onChange={(e) => setSettings({ ...settings, aboutTitle: e.target.value })} />
            <Textarea label="Content" rows={5} value={settings.aboutContent || ""} onChange={(e) => setSettings({ ...settings, aboutContent: e.target.value })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="CTA Label" value={settings.aboutCtaLabel || ""} onChange={(e) => setSettings({ ...settings, aboutCtaLabel: e.target.value })} />
              <Input label="CTA Link" value={settings.aboutCtaHref || ""} onChange={(e) => setSettings({ ...settings, aboutCtaHref: e.target.value })} />
            </div>
          </div>

          <Button loading={loading} onClick={() => saveSection("settings", settings)}>Save Homepage</Button>
        </div>
      )}

      {activeTab === "faq" && (
        <div className="card space-y-4">
          <h2 className="font-semibold">FAQ Section</h2>
          <Input label="Section Title" value={settings.faqTitle || ""} onChange={(e) => setSettings({ ...settings, faqTitle: e.target.value })} />
          <Textarea label="Section Subtitle" value={settings.faqSubtitle || ""} onChange={(e) => setSettings({ ...settings, faqSubtitle: e.target.value })} />
          {faqItems.map((item, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <Input label="Question" value={item.q} onChange={(e) => { const n = [...faqItems]; n[i] = { ...item, q: e.target.value }; setSettings({ ...settings, faqItems: n }); }} />
              <Textarea label="Answer" value={item.a} onChange={(e) => { const n = [...faqItems]; n[i] = { ...item, a: e.target.value }; setSettings({ ...settings, faqItems: n }); }} />
              <Button type="button" variant="danger" onClick={() => setSettings({ ...settings, faqItems: faqItems.filter((_, idx) => idx !== i) })}>Remove</Button>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => setSettings({ ...settings, faqItems: [...faqItems, { q: "New question?", a: "Answer here." }] })}>Add FAQ</Button>
          <Button loading={loading} onClick={() => saveSection("settings", settings)}>Save FAQ</Button>
        </div>
      )}

      {activeTab === "announcements" && (
        <div className="card space-y-4">
          <h2 className="font-semibold">Announcement Ticker</h2>
          <Textarea label="Ticker Text" value={settings.tickerText || ""} onChange={(e) => setSettings({ ...settings, tickerText: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!settings.tickerEnabled} onChange={(e) => setSettings({ ...settings, tickerEnabled: e.target.checked })} />
            Enable announcement ticker on public site
          </label>
          <Button loading={loading} onClick={() => saveSection("settings", settings)}>Save Ticker</Button>
        </div>
      )}

      {activeTab === "notices" && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <h2 className="font-semibold">Add New Notice</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Title" value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} />
              <Select label="Category" value={noticeForm.category} onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value as NoticeCategory })} options={NOTICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} />
            </div>
            <Textarea label="Content" value={noticeForm.content} onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Priority (10+ = pinned)" type="number" value={noticeForm.priority} onChange={(e) => setNoticeForm({ ...noticeForm, priority: Number(e.target.value) })} />
              <Input label="Expires on" type="date" value={noticeForm.expiresAt} onChange={(e) => setNoticeForm({ ...noticeForm, expiresAt: e.target.value })} />
              <Input label="Link URL" value={noticeForm.linkUrl} onChange={(e) => setNoticeForm({ ...noticeForm, linkUrl: e.target.value })} />
              <Input label="Link label" value={noticeForm.linkLabel} onChange={(e) => setNoticeForm({ ...noticeForm, linkLabel: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Attachment (optional)</label>
              <input
                key={noticeFileKey}
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700"
                onChange={(e) => setNoticeFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-xs text-gray-500">
                PDF, Word, or image up to 5 MB. Stored securely and shown as a download on the public notices section.
              </p>
              {noticeFile && (
                <p className="mt-1 text-xs font-medium text-primary-700">
                  Selected: {noticeFile.name} ({(noticeFile.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={noticeForm.notifyApplicants}
                onChange={(e) => setNoticeForm({ ...noticeForm, notifyApplicants: e.target.checked })}
              />
              Notify all applicants via email & WhatsApp when publishing this notice
            </label>
            <Button loading={loading} onClick={publishNotice}>Publish Notice</Button>
          </div>

          <div className="card">
            <h2 className="mb-4 font-semibold">All Notices</h2>
            <div className="space-y-3">
              {notices.map((n) => (
                <div key={n.id} className="flex items-start justify-between rounded-lg border p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{getNoticeCategoryLabel(n.category ?? "GENERAL")}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{n.content}</p>
                    {n.hasAttachment && n.attachmentUrl && (
                      <a
                        href={n.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline"
                      >
                        {n.attachmentFileName || "View attachment"}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="text-xs" onClick={() => saveSection("notice", { id: n.id, isActive: !n.isActive })}>{n.isActive ? "Deactivate" : "Activate"}</Button>
                    <Button variant="danger" className="text-xs" onClick={async () => { await fetch(`/api/admin/cms?type=notice&id=${n.id}`, { method: "DELETE" }); load(); }}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "pages" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {PAGE_SLUGS.map((p) => (
              <button key={p.slug} onClick={() => setActivePage(p.slug)} className={`rounded-lg px-4 py-2 text-sm font-medium ${activePage === p.slug ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700"}`}>{p.label}</button>
            ))}
          </div>
          <div className="card space-y-4">
            <Input label="Page Title" value={pages[activePage]?.title || ""} onChange={(e) => setPages({ ...pages, [activePage]: { ...pages[activePage], title: e.target.value } })} />
            <Textarea label="Page Content" rows={16} value={pages[activePage]?.content || ""} onChange={(e) => setPages({ ...pages, [activePage]: { ...pages[activePage], content: e.target.value } })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pages[activePage]?.isPublished !== false} onChange={(e) => setPages({ ...pages, [activePage]: { ...pages[activePage], isPublished: e.target.checked } })} />
              Published (visible on public site)
            </label>
            <p className="text-xs text-gray-500">Public URL: {PAGE_SLUGS.find((p) => p.slug === activePage)?.route}</p>
            <Button loading={loading} onClick={() => saveSection("page", { slug: activePage, ...pages[activePage] })}>Save Page</Button>
          </div>
        </div>
      )}

      {activeTab === "integrations" && integrations && (
        <IntegrationsSettingsPanel
          integrations={integrations}
          notificationSettings={settings}
          testEmail={testEmail}
          testPhone={testPhone}
          loading={loading}
          onIntegrationsChange={setIntegrations}
          onNotificationSettingsChange={(next) => setSettings({ ...settings, ...next })}
          onTestEmailChange={setTestEmail}
          onTestPhoneChange={setTestPhone}
          onSave={saveIntegrations}
          onTestEmail={() => testIntegration("email")}
          onTestWhatsapp={() => testIntegration("whatsapp")}
        />
      )}
    </div>
  );
}
