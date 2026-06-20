"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
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

function appUrlFromWebhookUrl(webhookUrl: string): string {
  const trimmed = webhookUrl.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  const withoutPath = trimmed.replace(/\/api\/webhooks\/whatsapp\/?$/i, "");
  return withoutPath || trimmed;
}

type IntegrationsState = {
  appUrl: string;
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
  notificationTemplates: NotificationEventTemplate[];
  diditApiKey: string;
  diditWebhookSecret: string;
  diditWorkflowIdIdentity: string;
  diditWorkflowIdBank: string;
  diditWorkflowIdUndertaking: string;
  diditRequireIdentityForScrutiny: boolean;
  diditEnabled: boolean;
  status: {
    emailConfigured: boolean;
    whatsappConfigured: boolean;
    diditConfigured: boolean;
    emailSource: string;
    whatsappSource: string;
    diditSource: string;
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
          className={`rounded-lg border p-4 ${integrations.status.diditConfigured ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}
        >
          <p className="font-semibold">Didit Verification</p>
          <p className="text-sm text-gray-600">
            {integrations.status.diditConfigured ? "Configured" : "Not configured"} · Source:{" "}
            {integrations.status.diditSource}
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
          Used for login links, Didit callbacks, and the default WhatsApp webhook URL below.
          For Google SEO, set the fellowship URL in the SEO & Google tab.
        </p>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Server keep-alive (Render free tier)</h2>
        <p className="text-sm text-gray-600">
          Free hosting sleeps after ~15 minutes without traffic. Ping this URL every 10–14 minutes
          using UptimeRobot, Cron-job.org, or the Render cron job in <code className="text-xs">render.yaml</code>.
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
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-600">
                <li>UptimeRobot: HTTP monitor every 5 minutes</li>
                <li>Cron-job.org: GET request every 12–14 minutes (avoid exact 15 min intervals)</li>
                <li>Render: set env <code>KEEPALIVE_URL</code> to this URL for the bundled cron job</li>
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
              Shared VGMF Meta catalog: <strong>vgmf_otp_auth</strong>,{" "}
              <strong>vgmf_account_created1</strong>, <strong>vgmf_registration_success</strong>,{" "}
              <strong>vgmf_under_review</strong>, <strong>vgmf_application_approved</strong>,{" "}
              <strong>vgmf_application_rejected</strong>. Do not use rejected{" "}
              <strong>vgmf_account_created</strong>.
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
          <strong>Meta template status:</strong> Templates showing &quot;Active – Quality pending&quot; in
          Meta are usable. Click <strong>Apply VGMF Meta templates</strong>, save settings, then validate.
          Enable WhatsApp per event only after Check Meta passes for that template.
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
        <h2 className="font-semibold">Didit Identity Verification</h2>
        <p className="text-sm text-gray-600">
          When online Didit verification is disabled, applicants submit documents manually and the
          Foundation verifies offline. Webhook URL:{" "}
          <code className="text-xs">
            {integrations.appUrl
              ? `${integrations.appUrl.startsWith("http") ? integrations.appUrl : `https://${integrations.appUrl}`}/api/didit/webhook`
              : "https://your-domain/api/didit/webhook"}
          </code>
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={integrations.diditEnabled !== false}
            onChange={(e) =>
              onIntegrationsChange({ ...integrations, diditEnabled: e.target.checked })
            }
          />
          Enable online Didit verification for applicants
        </label>
        {integrations.status.diditConfigured && integrations.diditEnabled !== false && (
          <p className="text-sm text-green-700">Didit credentials are saved. Leave secret fields empty to keep them.</p>
        )}
        <Input
          label="Didit API Key"
          type="password"
          value={integrations.diditApiKey}
          placeholder={integrations.status.diditConfigured ? "Leave empty to keep saved key" : "Paste DIDIT_API_KEY"}
          onChange={(e) => onIntegrationsChange({ ...integrations, diditApiKey: e.target.value })}
        />
        <Input
          label="Didit Webhook Secret"
          type="password"
          value={integrations.diditWebhookSecret}
          placeholder={
            integrations.status.diditConfigured ? "Leave empty to keep saved secret" : "Paste DIDIT_WEBHOOK_SECRET"
          }
          onChange={(e) => onIntegrationsChange({ ...integrations, diditWebhookSecret: e.target.value })}
        />
        <Input
          label="Workflow ID — Applicant identity"
          value={integrations.diditWorkflowIdIdentity}
          onChange={(e) =>
            onIntegrationsChange({ ...integrations, diditWorkflowIdIdentity: e.target.value })
          }
        />
        <Input
          label="Workflow ID — Bank account verification"
          value={integrations.diditWorkflowIdBank}
          onChange={(e) => onIntegrationsChange({ ...integrations, diditWorkflowIdBank: e.target.value })}
        />
        <Input
          label="Workflow ID — Undertaking identity"
          value={integrations.diditWorkflowIdUndertaking}
          onChange={(e) =>
            onIntegrationsChange({ ...integrations, diditWorkflowIdUndertaking: e.target.value })
          }
          placeholder="Optional — uses Applicant identity workflow if blank"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={integrations.diditRequireIdentityForScrutiny}
            onChange={(e) =>
              onIntegrationsChange({
                ...integrations,
                diditRequireIdentityForScrutiny: e.target.checked,
              })
            }
          />
          Require Didit identity verification before admin document scrutiny approval
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
