import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { buildSeoAdminStatus } from "@/lib/seo-config";
import { FELLOWSHIP_PUBLIC_SITE_URL, PUBLIC_CMS_SLUGS, resolvePublicSiteUrl } from "@/lib/seo";

type SeoSettingsFields = {
  publicSiteUrl?: string;
  seoMetaTitle?: string;
  seoMetaDescription?: string;
  seoKeywords?: string;
  googleSiteVerification?: string;
  googleAnalyticsId?: string;
  seoIndexingEnabled?: boolean;
  seoStructuredDataEnabled?: boolean;
  siteName?: string;
  siteTagline?: string;
};

interface SeoSettingsPanelProps {
  settings: SeoSettingsFields;
  integrationAppUrl?: string;
  loading: boolean;
  onChange: (settings: SeoSettingsFields) => void;
  onSave: () => void;
}

function copyText(value: string) {
  void navigator.clipboard.writeText(value);
}

export function SeoSettingsPanel({
  settings,
  integrationAppUrl,
  loading,
  onChange,
  onSave,
}: SeoSettingsPanelProps) {
  const resolvedAppUrl = resolvePublicSiteUrl({
    publicSiteUrl: settings.publicSiteUrl,
    integrationAppUrl,
  });
  const integrationLooksWrong = Boolean(
    integrationAppUrl?.includes("seminar.") && !settings.publicSiteUrl?.trim()
  );

  const status = buildSeoAdminStatus(
    {
      siteName: settings.siteName || "",
      siteTagline: settings.siteTagline || "",
      seoMetaTitle: settings.seoMetaTitle ?? null,
      seoMetaDescription: settings.seoMetaDescription ?? null,
      seoKeywords: settings.seoKeywords ?? null,
      googleSiteVerification: settings.googleSiteVerification ?? null,
      googleAnalyticsId: settings.googleAnalyticsId ?? null,
      seoIndexingEnabled: settings.seoIndexingEnabled ?? true,
      seoStructuredDataEnabled: settings.seoStructuredDataEnabled ?? true,
    },
    resolvedAppUrl
  );

  const indexedPages = [
    { label: "Homepage", path: "/" },
    { label: "Register", path: "/register" },
    ...PUBLIC_CMS_SLUGS.map((slug) => ({
      label: slug.replace(/-/g, " "),
      path: `/${slug}`,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div>
          <h2 className="font-semibold text-ink">Google visibility status</h2>
          <p className="mt-1 text-sm text-muted">
            Manage how the public fellowship site appears in Google Search and Analytics.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#e4ede8] bg-primary-50/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Search Console</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {status.googleConfigured ? "Verification configured" : "Not configured"}
            </p>
          </div>
          <div className="rounded-xl border border-[#e4ede8] bg-primary-50/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Analytics</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {status.analyticsConfigured ? "Tracking active" : "Not configured"}
            </p>
          </div>
          <div className="rounded-xl border border-[#e4ede8] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Indexing</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {status.indexingEnabled ? "Public pages indexable" : "Indexing disabled"}
            </p>
          </div>
          <div className="rounded-xl border border-[#e4ede8] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Structured data</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {status.structuredDataEnabled ? "JSON-LD enabled" : "Disabled"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#e4ede8] bg-white p-4">
          <p className="text-sm font-semibold text-ink">Setup checklist</p>
          <ul className="mt-3 space-y-2">
            {status.checklist.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-sm">
                <span className={item.ok ? "text-green-600" : "text-amber-600"}>
                  {item.ok ? "✓" : "○"}
                </span>
                <span>
                  <span className="font-medium text-ink">{item.label}</span>
                  {!item.ok && item.hint && (
                    <span className="block text-xs text-muted">{item.hint}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {integrationLooksWrong && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            API Settings still points to the seminar site ({integrationAppUrl}). SEO URLs below use
            the fellowship domain instead. Save{" "}
            <strong>{FELLOWSHIP_PUBLIC_SITE_URL}</strong> as the public site URL, and update App URL
            in API Settings for webhooks and Digio callbacks.
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-ink">Fellowship public site URL</h3>
        <p className="text-sm text-muted">
          Used for sitemap, robots.txt, canonical links, and Google Search Console. This is the
          fellowship portal — not the seminar website.
        </p>
        <Input
          label="Public site URL"
          value={settings.publicSiteUrl || ""}
          onChange={(e) => onChange({ ...settings, publicSiteUrl: e.target.value })}
          placeholder={FELLOWSHIP_PUBLIC_SITE_URL}
        />
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-ink">Google Search URLs</h3>
        <div className="space-y-3">
          {[
            { label: "Sitemap", value: status.sitemapUrl },
            { label: "Robots.txt", value: status.robotsUrl },
            { label: "Public site", value: status.appUrl },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">{item.label}</p>
                <p className="mt-1 break-all text-sm text-ink-soft">{item.value}</p>
              </div>
              <Button type="button" variant="secondary" className="shrink-0" onClick={() => copyText(item.value)}>
                Copy
              </Button>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">
          Submit the sitemap in{" "}
          <a
            href={status.searchConsoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary-700 hover:underline"
          >
            Google Search Console
          </a>
          {" "}after saving your verification code below.
        </p>
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-ink">Indexed public pages</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {indexedPages.map((page) => (
            <div key={page.path} className="rounded-lg border border-[#e4ede8] px-3 py-2 text-sm">
              <span className="font-medium capitalize text-ink">{page.label}</span>
              <span className="block text-xs text-muted">{status.appUrl}{page.path}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-ink">SEO & Google settings</h3>
        <Input
          label="SEO meta title (optional override)"
          value={settings.seoMetaTitle || ""}
          onChange={(e) => onChange({ ...settings, seoMetaTitle: e.target.value })}
          placeholder={settings.siteName || "Defaults to site name"}
        />
        <Textarea
          label="SEO meta description"
          value={settings.seoMetaDescription || ""}
          onChange={(e) => onChange({ ...settings, seoMetaDescription: e.target.value })}
          placeholder={settings.siteTagline || "Defaults to site tagline"}
          rows={3}
        />
        <Textarea
          label="SEO keywords (comma-separated)"
          value={settings.seoKeywords || ""}
          onChange={(e) => onChange({ ...settings, seoKeywords: e.target.value })}
          placeholder="VGMF Fellowship, Ayurvedic research fellowship, Viddhakarma research"
          rows={2}
        />
        <Input
          label="Google Search Console verification code"
          value={settings.googleSiteVerification || ""}
          onChange={(e) => onChange({ ...settings, googleSiteVerification: e.target.value })}
          placeholder="Paste content value from meta tag (not the full tag)"
        />
        <Input
          label="Google Analytics 4 Measurement ID"
          value={settings.googleAnalyticsId || ""}
          onChange={(e) => onChange({ ...settings, googleAnalyticsId: e.target.value })}
          placeholder="G-XXXXXXXXXX"
        />

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Google Search Console — test these URLs only</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <code>{resolvedAppUrl}/</code> (homepage)
            </li>
            <li>
              <code>{resolvedAppUrl}/register</code>
            </li>
            <li>
              <code>{resolvedAppUrl}/about</code>, <code>/rulebook</code>, <code>/terms</code>
            </li>
          </ul>
          <p className="mt-2">
            Do not request indexing for <code>/applicant</code>, <code>/login</code>, or{" "}
            <code>/admin</code> — those use <code>noindex</code> and are omitted from the sitemap.
          </p>
          <p className="mt-2">
            Add the Search Console property <code>{resolvedAppUrl}</code> (not vaidyagogate.org).
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.seoIndexingEnabled !== false}
            onChange={(e) => onChange({ ...settings, seoIndexingEnabled: e.target.checked })}
          />
          Allow Google and other search engines to index the public site
        </label>
        <p className="text-xs text-gray-600">
          Public pages indexed: homepage, register, about, terms, rulebook, privacy, and related CMS
          pages. Portal routes such as <code>/applicant</code> and <code>/admin</code> use{" "}
          <code>noindex</code> and are not listed in the sitemap.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.seoStructuredDataEnabled !== false}
            onChange={(e) => onChange({ ...settings, seoStructuredDataEnabled: e.target.checked })}
          />
          Enable structured data (Organization, WebSite, FAQ JSON-LD)
        </label>

        <Button loading={loading} onClick={onSave}>
          Save SEO settings
        </Button>
      </div>
    </div>
  );
}
