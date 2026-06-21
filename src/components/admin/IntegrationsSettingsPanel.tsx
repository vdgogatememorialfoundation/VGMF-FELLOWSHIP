"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type {
  NotificationChannelOption,
  NotificationEventKey,
  NotificationEventTemplate,
  NotificationValidationIssue,
} from "@/lib/notification-templates";
import { applyEmailOnlyAlertChannels, applyRecommendedMetaTemplates } from "@/lib/notification-templates";

function buildWhatsAppWebhookUrl(appUrl: string): string {
  if (!appUrl?.trim()) return "";
  const base = appUrl.trim().startsWith("http") ? appUrl.trim() : `https://${appUrl.trim()}`;
  return `${base.replace(/\/$/, "")}/api/webhooks/whatsapp`;
}

function buildDigioWebhookUrl(appUrl: string): string {
  if (!appUrl?.trim()) return "https://your-domain/api/digio/webhook";
  const base = appUrl.trim().startsWith("http") ? appUrl.trim() : `https://${appUrl.trim()}`;
  return `${base.replace(/\/$/, "")}/api/digio/webhook`;
}

function appUrlFromWebhookUrl(webhookUrl: string): string {
  const trimmed = webhookUrl.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  const withoutPath = trimmed.replace(/\/api\/webhooks\/whatsapp\/?$/i, "");
  return withoutPath || trimmed;
}

type IntegrationsState = {
  appUrl: string;
  appUrlCorrectedFromStored?: boolean;
  zeptomailToken: string;
  zeptomailFromEmail: string;
  zeptomailFromName: string;
  whatsappToken: string;
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;
  whatsappWebhookVerifyToken: string;
  whatsappOtpTemplateName: string;
  whatsappOtpTemplateLanguage: string;
  whatsappApiVersion: string;
  emailOtpSubject: string;
  whatsappWebhookUrl?: string;
  digioWebhookUrl?: string;
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
  digioBankConfigured?: boolean;
  digioIdentityConfigured?: boolean;
    emailSource: string;
    whatsappSource: string;
    digioSource: string;
  };
};

type NotificationToggleSettings = {
  signupOtpEmailEnabled?: boolean;
  signupOtpWhatsappEnabled?: boolean;
  applicationNotifyEmailEnabled?: boolean;
  applicationNotifyWhatsappEnabled?: boolean;
  welcomeEmailEnabled?: boolean;
  welcomeWhatsappEnabled?: boolean;
  alertsEmailEnabled?: boolean;
  alertsWhatsappEnabled?: boolean;
  statusNotifyEmailEnabled?: boolean;
  statusNotifyWhatsappEnabled?: boolean;
};

const CHANNEL_OPTIONS: Array<{ value: NotificationChannelOption; label: string }> = [
  { value: "BOTH", label: "WhatsApp + Email" },
  { value: "WHATSAPP", label: "WhatsApp only" },
  { value: "EMAIL", label: "Email only" },
  { value: "NONE", label: "Disabled" },
];

export function IntegrationsSettingsPanel({
  integrations,
  notificationSettings,
  testEmail,
  testPhone,
  loading,
  onIntegrationsChange,
  onNotificationSettingsChange,
  onTestEmailChange,
  onTestPhoneChange,
  onSave,
  onTestEmail,
  onTestWhatsapp,
}: {
  integrations: IntegrationsState;
  notificationSettings: NotificationToggleSettings;
  testEmail: string;
  testPhone: string;
  loading: boolean;
  onIntegrationsChange: (next: IntegrationsState) => void;
  onNotificationSettingsChange: (next: NotificationToggleSettings) => void;
  onTestEmailChange: (value: string) => void;
  onTestPhoneChange: (value: string) => void;
  onSave: () => void;
  onTestEmail: () => void;
  onTestWhatsapp: () => void;
}) {
  const [validationIssues, setValidationIssues] = useState<NotificationValidationIssue[]>([]);
  const [checkMessage, setCheckMessage] = useState("");
  const [checking, setChecking] = useState(false);

  function updateTemplate(
    event: NotificationEventKey,
    patch: Partial<NotificationEventTemplate>
  ) {
    onIntegrationsChange({
      ...integrations,
      notificationTemplates: integrations.notificationTemplates.map((row) =>
        row.event === event ? { ...row, ...patch } : row
      ),
    });
  }

  async function runValidation(action: "validate-all" | "check-webhook" | "check-credentials") {
    setChecking(true);
    setCheckMessage("");
    setValidationIssues([]);
    try {
      const res = await fetch("/api/admin/integrations/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (action === "validate-all") {
        setValidationIssues(data.issues || []);
        setCheckMessage(
          data.ok
            ? "Critical checks passed. Review any warnings before enabling WhatsApp on additional events."
            : "Fix the errors below — only WhatsApp OTP must be approved to start signup OTP messages."
        );
      } else {
        setCheckMessage(data.message || data.error || "Check completed.");
        if (!data.ok) {
          setValidationIssues([{ level: "error", message: data.message || data.error }]);
        }
      }
    } catch {
      setCheckMessage("Could not run validation.");
    } finally {
      setChecking(false);
    }
  }

  async function checkTemplate(event: NotificationEventKey) {
    setChecking(true);
    setCheckMessage("");
    try {
      const res = await fetch("/api/admin/integrations/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-template", event }),
      });
      const data = await res.json();
      setCheckMessage(data.message || data.error || "Template check completed.");
    } finally {
      setChecking(false);
    }
  }

  const webhookUrl = buildWhatsAppWebhookUrl(integrations.appUrl) || integrations.whatsappWebhookUrl || "";
  const digioWebhookUrl =
    integrations.digioWebhookUrl || buildDigioWebhookUrl(integrations.appUrl);

  async function copyWebhookUrl() {
    const url = buildWhatsAppWebhookUrl(integrations.appUrl) || webhookUrl;
    if (!url) {
      setCheckMessage("Set App URL first to generate the webhook URL.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCheckMessage("Webhook URL copied. Paste it in Meta → WhatsApp → Configuration → Webhook.");
    } catch {
      setCheckMessage(url);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div
          className={`rounded-lg border p-4 ${integrations.status.emailConfigured ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}
        >
          <p className="font-semibold">ZeptoMail Email</p>
          <p className="text-sm text-gray-600">
            {integrations.status.emailConfigured ? "Configured" : "Not configured"} · Source:{" "}
            {integrations.status.emailSource}
          </p>
        </div>
        <div
          className={`rounded-lg border p-4 ${integrations.status.whatsappConfigured ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}
        >
          <p className="font-semibold">Meta WhatsApp</p>
          <p className="text-sm text-gray-600">
            {integrations.status.whatsappConfigured ? "Configured" : "Not configured"} · Source:{" "}
            {integrations.status.whatsappSource}
          </p>
        </div>
        <div
          className={`rounded-lg border p-4 ${integrations.status.digioConfigured ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}
        >
          <p className="font-semibold">Digio Verification</p>
          <p className="text-sm text-gray-600">
            Identity KYC: {integrations.status.digioIdentityConfigured ? "Active" : "Off"} · Bank
            penny drop: {integrations.status.digioBankConfigured ? "Active" : "Off"} · Source:{" "}
            {integrations.status.digioSource}
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">General</h2>
        <Input
          label="App URL"
          value={integrations.appUrl}
          placeholder="https://fellowship.vaidyagogate.org"
          onChange={(e) => onIntegrationsChange({ ...integrations, appUrl: e.target.value })}
        />
        <p className="text-xs text-gray-500">
          Used for login links, Digio callbacks, and the default WhatsApp webhook URL below.
          For Google SEO, set the fellowship URL in the SEO & Google tab.
        </p>
        {integrations.appUrlCorrectedFromStored && (
          <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            Saved App URL pointed at the seminar site. The fellowship URL is shown below — click
            Save to store it permanently.
          </p>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Server keep-alive (Render free tier)</h2>
        <p className="text-sm text-gray-600">
          Free Render hosting sleeps after ~15 minutes without traffic. While awake, the app pings
          itself every 30 seconds. A separate Render cron job must ping every 5 minutes to prevent
          sleep — otherwise visitors see the Render &quot;Application Loading&quot; screen.
        </p>
        {(() => {
          const base = integrations.appUrl?.startsWith("http")
            ? integrations.appUrl.replace(/\/$/, "")
            : integrations.appUrl
              ? `https://${integrations.appUrl.replace(/\/$/, "")}`
              : "";
          const keepAliveUrl = base ? `${base}/api/health` : "/api/health";
          return (
            <div className="rounded-lg border border-[#e4ede8] bg-primary-50/30 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Ping URL</p>
              <p className="mt-1 break-all text-sm font-medium text-ink">{keepAliveUrl}</p>
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                <p className="font-semibold">Render Dashboard check (required)</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>
                    Open{" "}
                    <a
                      href="https://dashboard.render.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-700 underline"
                    >
                      dashboard.render.com
                    </a>
                  </li>
                  <li>
                    Confirm cron job <code>fellowship-keepalive</code> exists and status is{" "}
                    <strong>Active</strong>
                  </li>
                  <li>
                    If missing: <strong>New + → Cron Job</strong> → same repo → schedule{" "}
                    <code>*/5 * * * *</code> → command{" "}
                    <code>node scripts/render-cron-ping.mjs</code>
                  </li>
                </ol>
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-600">
                <li>Built-in: self-ping every 30s while awake (Render logs: [keepalive])</li>
                <li>Background: external ping every 30s via start:render script</li>
                <li>Render cron: external ping every 5 min (health + robots + sitemap + home)</li>
                <li>Backup: use UptimeRobot or cron-job.org on {keepAliveUrl}</li>
              </ul>
            </div>
          );
        })()}
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">ZeptoMail (Email & OTP)</h2>
        <p className="text-sm text-gray-600">
          India ZeptoMail accounts use <code className="text-xs">api.zeptomail.in</code> automatically.
        </p>
        {integrations.status.emailConfigured && (
          <p className="text-sm text-green-700">Send Mail Token is saved. Leave empty below to keep it.</p>
        )}
        <Input
          label="Send Mail Token"
          type="password"
          value={integrations.zeptomailToken}
          placeholder={
            integrations.status.emailConfigured ? "Leave empty to keep saved token" : "Paste ZeptoMail token"
          }
          onChange={(e) => onIntegrationsChange({ ...integrations, zeptomailToken: e.target.value })}
        />
        <Input
          label="From Email"
          value={integrations.zeptomailFromEmail}
          onChange={(e) => onIntegrationsChange({ ...integrations, zeptomailFromEmail: e.target.value })}
        />
        <Input
          label="From Name"
          value={integrations.zeptomailFromName}
          onChange={(e) => onIntegrationsChange({ ...integrations, zeptomailFromName: e.target.value })}
        />
        <div className="flex gap-2">
          <Input label="Test email address" value={testEmail} onChange={(e) => onTestEmailChange(e.target.value)} />
          <Button type="button" variant="secondary" className="self-end" loading={loading} onClick={onTestEmail}>
            Send test
          </Button>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Meta WhatsApp Business</h2>
            <p className="mt-1 text-sm text-gray-600">
              Configure WhatsApp Cloud API credentials, webhook, and template defaults.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" loading={checking} onClick={() => runValidation("check-credentials")}>
              Check credentials
            </Button>
            <Button type="button" variant="secondary" loading={checking} onClick={() => runValidation("check-webhook")}>
              Check webhook
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label="Webhook URL (register in Meta)"
              value={webhookUrl}
              placeholder="https://fellowship.vaidyagogate.org/api/webhooks/whatsapp"
              onChange={(e) => {
                const nextWebhook = e.target.value;
                const nextAppUrl = appUrlFromWebhookUrl(nextWebhook);
                onIntegrationsChange({
                  ...integrations,
                  appUrl: nextAppUrl || integrations.appUrl,
                });
              }}
            />
          </div>
          <Button type="button" variant="secondary" className="mb-0.5 shrink-0" onClick={copyWebhookUrl}>
            Copy URL
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Edit this URL or App URL above — both stay in sync. Use the same verify token in Meta and in the field below,
          then click Save.
        </p>
        {integrations.status.whatsappConfigured && (
          <p className="text-sm text-green-700">WhatsApp token is saved. Leave empty below to keep it.</p>
        )}
        <Input
          label="Access Token (System User)"
          type="password"
          value={integrations.whatsappToken}
          placeholder={integrations.status.whatsappConfigured ? "Leave empty to keep saved token" : "Paste Meta token"}
          onChange={(e) => onIntegrationsChange({ ...integrations, whatsappToken: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone Number ID"
            value={integrations.whatsappPhoneNumberId}
            onChange={(e) =>
              onIntegrationsChange({ ...integrations, whatsappPhoneNumberId: e.target.value })
            }
          />
          <Input
            label="WhatsApp Business Account ID (WABA)"
            value={integrations.whatsappBusinessAccountId}
            onChange={(e) =>
              onIntegrationsChange({ ...integrations, whatsappBusinessAccountId: e.target.value })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Webhook verify token"
            value={integrations.whatsappWebhookVerifyToken}
            placeholder="vgmf_whatsapp_verify_2026"
            onChange={(e) =>
              onIntegrationsChange({ ...integrations, whatsappWebhookVerifyToken: e.target.value })
            }
          />
          <Input
            label="Default WhatsApp template language"
            value={integrations.whatsappOtpTemplateLanguage}
            onChange={(e) =>
              onIntegrationsChange({ ...integrations, whatsappOtpTemplateLanguage: e.target.value })
            }
          />
        </div>
        <Input
          label="Graph API version"
          value={integrations.whatsappApiVersion}
          onChange={(e) => onIntegrationsChange({ ...integrations, whatsappApiVersion: e.target.value })}
        />
        <div className="flex gap-2">
          <Input label="Test phone (91XXXXXXXXXX)" value={testPhone} onChange={(e) => onTestPhoneChange(e.target.value)} />
          <Button type="button" variant="secondary" className="self-end" loading={loading} onClick={onTestWhatsapp}>
            Send test
          </Button>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">OTP Notifications (Email + WhatsApp)</h2>
        <Input
          label="WhatsApp OTP template name"
          value={
            integrations.notificationTemplates.find((item) => item.event === "OTP_VERIFICATION")
              ?.whatsappTemplateName || integrations.whatsappOtpTemplateName
          }
          onChange={(e) => {
            updateTemplate("OTP_VERIFICATION", { whatsappTemplateName: e.target.value });
            onIntegrationsChange({ ...integrations, whatsappOtpTemplateName: e.target.value });
          }}
        />
        <Input
          label="Email OTP subject"
          value={integrations.emailOtpSubject}
          placeholder="Verify your email — {{portal_title}}"
          onChange={(e) => onIntegrationsChange({ ...integrations, emailOtpSubject: e.target.value })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notificationSettings.signupOtpEmailEnabled !== false}
              onChange={(e) =>
                onNotificationSettingsChange({
                  ...notificationSettings,
                  signupOtpEmailEnabled: e.target.checked,
                })
              }
            />
            Require email OTP during signup
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notificationSettings.signupOtpWhatsappEnabled !== false}
              onChange={(e) =>
                onNotificationSettingsChange({
                  ...notificationSettings,
                  signupOtpWhatsappEnabled: e.target.checked,
                })
              }
            />
            Require WhatsApp OTP during signup
          </label>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Alert channel toggles</h2>
            <p className="mt-1 text-sm text-gray-600">
              Enable or disable email and WhatsApp for each alert category.
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["welcomeEmailEnabled", "Welcome email on registration", false],
              ["welcomeWhatsappEnabled", "Welcome WhatsApp on registration", true],
              ["applicationNotifyEmailEnabled", "Application submitted email", false],
              ["applicationNotifyWhatsappEnabled", "Application submitted WhatsApp", false],
              ["statusNotifyEmailEnabled", "Status & document update emails", false],
              ["statusNotifyWhatsappEnabled", "Status & document update WhatsApp", false],
              ["alertsEmailEnabled", "General portal alert emails", false],
              ["alertsWhatsappEnabled", "General portal alert WhatsApp", false],
            ] as const
          ).map(([key, label, defaultFalse]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={
                  defaultFalse
                    ? notificationSettings[key] === true
                    : notificationSettings[key] !== false
                }
                onChange={(e) =>
                  onNotificationSettingsChange({
                    ...notificationSettings,
                    [key]: e.target.checked,
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">WhatsApp Meta templates (all events)</h2>
            <p className="mt-1 text-sm text-gray-600">
              Each event uses its own Meta template with <strong>no body parameters</strong> (static
              send). Only <strong>vgmf_otp_auth</strong> is filled dynamically with the OTP code.
              Status updates map to different templates (e.g.{" "}
              <strong>vgmf_under_review</strong>, <strong>vgmf_application_approved</strong>,{" "}
              <strong>vgmf_application_rejected</strong>).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                onIntegrationsChange({
                  ...integrations,
                  notificationTemplates: applyRecommendedMetaTemplates(
                    integrations.notificationTemplates
                  ),
                })
              }
            >
              Apply VGMF Meta templates
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                onIntegrationsChange({
                  ...integrations,
                  notificationTemplates: applyEmailOnlyAlertChannels(
                    integrations.notificationTemplates
                  ),
                })
              }
            >
              Use email-only alerts
            </Button>
            <Button type="button" variant="secondary" loading={checking} onClick={() => runValidation("validate-all")}>
              Validate all notifications
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <strong>WhatsApp sends:</strong> Alert templates are sent empty (fixed Meta text per
          template). Only OTP uses a filled parameter. Click <strong>Apply VGMF Meta templates</strong>
          , save, then validate before enabling WhatsApp on each event.
        </div>

        {checkMessage && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            {checkMessage}
          </div>
        )}

        {validationIssues.length > 0 && (
          <div className="space-y-2">
            {validationIssues.map((issue, index) => (
              <div
                key={`${issue.event || "global"}-${index}`}
                className={`rounded-lg border p-3 text-sm ${
                  issue.level === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                {issue.event ? `[${issue.event}] ` : ""}
                {issue.message}
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 pr-3">Event</th>
                <th className="pb-3 pr-3">Channel</th>
                <th className="pb-3 pr-3">Meta template name</th>
                <th className="pb-3 pr-3">Lang</th>
                <th className="pb-3 pr-3">Email subject</th>
                <th className="pb-3">Check</th>
              </tr>
            </thead>
            <tbody>
              {integrations.notificationTemplates.map((row) => (
                <tr key={row.event} className="border-b align-top last:border-0">
                  <td className="py-3 pr-3">
                    <p className="font-medium text-gray-900">{row.label}</p>
                    <p className="mt-1 text-xs text-gray-500">{row.description}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <select
                      className="input-field py-2"
                      value={row.channel}
                      onChange={(e) =>
                        updateTemplate(row.event, {
                          channel: e.target.value as NotificationChannelOption,
                        })
                      }
                    >
                      {CHANNEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-3">
                    <input
                      className="input-field py-2"
                      value={row.whatsappTemplateName}
                      disabled={row.channel === "EMAIL" || row.channel === "NONE"}
                      onChange={(e) =>
                        updateTemplate(row.event, { whatsappTemplateName: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <input
                      className="input-field w-20 py-2"
                      value={row.whatsappTemplateLanguage}
                      disabled={row.channel === "EMAIL" || row.channel === "NONE"}
                      onChange={(e) =>
                        updateTemplate(row.event, { whatsappTemplateLanguage: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <input
                      className="input-field py-2"
                      value={row.emailSubject}
                      disabled={row.channel === "WHATSAPP" || row.channel === "NONE"}
                      onChange={(e) => updateTemplate(row.event, { emailSubject: e.target.value })}
                    />
                  </td>
                  <td className="py-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs"
                      loading={checking}
                      disabled={row.channel === "EMAIL" || row.channel === "NONE"}
                      onClick={() => checkTemplate(row.event)}
                    >
                      Check Meta
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Digio DigiKYC & Bank Verification</h2>
        <p className="text-sm text-gray-600">
          When online Digio verification is disabled, applicants submit documents manually and the
          Foundation verifies offline. Register this webhook URL in the Digio dashboard:{" "}
          <code className="text-xs">{digioWebhookUrl}</code>
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={integrations.digioEnabled !== false}
            onChange={(e) =>
              onIntegrationsChange({ ...integrations, digioEnabled: e.target.checked })
            }
          />
          Enable online Digio verification for applicants
        </label>
        {integrations.status.digioConfigured && integrations.digioEnabled !== false && (
          <p className="text-sm text-green-700">
            Digio credentials are saved. Leave secret fields empty to keep them.
          </p>
        )}
        <Select
          label="Digio environment"
          value={integrations.digioEnvironment || "production"}
          onChange={(e) =>
            onIntegrationsChange({ ...integrations, digioEnvironment: e.target.value })
          }
          options={[
            { value: "production", label: "Production (api.digio.in)" },
            { value: "sandbox", label: "Sandbox (ext.digio.in)" },
          ]}
        />
        <Input
          label="Digio Client ID"
          type="password"
          value={integrations.digioClientId}
          placeholder={
            integrations.status.digioConfigured ? "Leave empty to keep saved ID" : "Paste DIGIO_CLIENT_ID"
          }
          onChange={(e) => onIntegrationsChange({ ...integrations, digioClientId: e.target.value })}
        />
        <Input
          label="Digio Client Secret"
          type="password"
          value={integrations.digioClientSecret}
          placeholder={
            integrations.status.digioConfigured
              ? "Leave empty to keep saved secret"
              : "Paste DIGIO_CLIENT_SECRET"
          }
          onChange={(e) =>
            onIntegrationsChange({ ...integrations, digioClientSecret: e.target.value })
          }
        />
        <Input
          label="Digio Webhook Secret"
          type="password"
          value={integrations.digioWebhookSecret}
          placeholder={
            integrations.status.digioConfigured
              ? "Leave empty to keep saved secret"
              : "Paste DIGIO_WEBHOOK_SECRET"
          }
          onChange={(e) =>
            onIntegrationsChange({ ...integrations, digioWebhookSecret: e.target.value })
          }
        />
        <Input
          label="Template — Applicant identity (optional override)"
          value={integrations.digioTemplateIdentity}
          onChange={(e) =>
            onIntegrationsChange({ ...integrations, digioTemplateIdentity: e.target.value })
          }
          placeholder="Optional — uses standard Digio KYC when empty"
        />
        <Input
          label="Template — Bank account (optional DigiStudio flow)"
          value={integrations.digioTemplateBank}
          onChange={(e) =>
            onIntegrationsChange({ ...integrations, digioTemplateBank: e.target.value })
          }
          placeholder="Bank verification uses penny drop API with client credentials"
        />
        <Input
          label="Template — Undertaking identity"
          value={integrations.digioTemplateUndertaking}
          onChange={(e) =>
            onIntegrationsChange({ ...integrations, digioTemplateUndertaking: e.target.value })
          }
          placeholder="Optional — face-match / re-KYC template"
        />
        <p className="text-xs text-gray-500">
          Client ID and secret enable standard Digio identity KYC (Web SDK v11) and bank penny-drop
          verification. When Digio is disabled, applicants upload ID documents and bank proof for
          manual review. Docs:{" "}
          <a
            className="text-primary-700 underline"
            href="https://documentation.digio.in/sdk/web/web/"
            target="_blank"
            rel="noreferrer"
          >
            Web SDK
          </a>
          ,{" "}
          <a
            className="text-primary-700 underline"
            href="https://documentation.digio.in/digikyc/"
            target="_blank"
            rel="noreferrer"
          >
            DigiKYC
          </a>
          ,{" "}
          <a
            className="text-primary-700 underline"
            href="https://documentation.digio.in/digikyc/bank_account_verification/"
            target="_blank"
            rel="noreferrer"
          >
            Bank verification
          </a>
          ,{" "}
          <a
            className="text-primary-700 underline"
            href="https://documentation.digio.in/webhooks/"
            target="_blank"
            rel="noreferrer"
          >
            Webhooks
          </a>
          .
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={integrations.digioRequireIdentityForScrutiny}
            onChange={(e) =>
              onIntegrationsChange({
                ...integrations,
                digioRequireIdentityForScrutiny: e.target.checked,
              })
            }
          />
          Require Digio online identity verification before admin document scrutiny approval
          {!integrations.status.digioIdentityConfigured ? " (add Digio client credentials first)" : ""}
        </label>
      </div>

      <p className="text-xs text-gray-500">
        Settings saved here override environment variables. Secret fields are never shown after save — leave them empty
        to keep the current token.
      </p>
      <Button loading={loading} onClick={onSave}>
        Save API & notification settings
      </Button>
    </div>
  );
}
