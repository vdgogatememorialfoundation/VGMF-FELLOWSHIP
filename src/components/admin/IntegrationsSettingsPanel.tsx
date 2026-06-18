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
            ? "All notification checks passed."
            : "Some notification checks failed — review the list below."
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

  const webhookUrl =
    integrations.whatsappWebhookUrl ||
    `${integrations.appUrl?.startsWith("http") ? integrations.appUrl : `https://${integrations.appUrl}`}/api/webhooks/whatsapp`;

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
          onChange={(e) => onIntegrationsChange({ ...integrations, appUrl: e.target.value })}
        />
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

        <Input label="Webhook URL (register in Meta)" value={webhookUrl} readOnly />
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
              ["signupOtpEmailEnabled", "Require email OTP during signup", false],
              ["signupOtpWhatsappEnabled", "Require WhatsApp OTP during signup", false],
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
              Map each portal alert to a Meta-approved template. Use Check on Meta to verify names.
            </p>
          </div>
          <Button type="button" variant="secondary" loading={checking} onClick={() => runValidation("validate-all")}>
            Validate all notifications
          </Button>
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
          Webhook URL:{" "}
          <code className="text-xs">
            {integrations.appUrl
              ? `${integrations.appUrl.startsWith("http") ? integrations.appUrl : `https://${integrations.appUrl}`}/api/didit/webhook`
              : "https://your-domain/api/didit/webhook"}
          </code>
        </p>
        {integrations.status.diditConfigured && (
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
