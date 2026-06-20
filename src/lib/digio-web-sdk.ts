/**
 * Digio Web SDK (KYC / eSign) — https://documentation.digio.in/sdk/web/web/
 *
 * Flow:
 * 1. Backend creates KYC request with generate_access_token → request id + GWT token
 * 2. Load digio.js for sandbox or production
 * 3. new Digio(options) → init() on user click → submit(requestId, identifier, tokenId)
 */

export type DigioWebSdkEnvironment = "sandbox" | "production";

export type DigioWebSdkCallbackResponse = {
  error_code?: number | string;
  [key: string]: unknown;
};

export type DigioWebSdkOptions = {
  environment: DigioWebSdkEnvironment;
  callback: (response: DigioWebSdkCallbackResponse) => void;
  logo?: string;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
  };
  is_iframe?: boolean;
  is_redirection_approach?: boolean;
  redirect_url?: string | null;
};

export type DigioWebSdkInstance = {
  init: () => void;
  submit: (requestId: string, identifier: string, tokenId?: string) => void;
  cancel?: () => void;
};

declare global {
  interface Window {
    Digio?: new (options: DigioWebSdkOptions) => DigioWebSdkInstance;
  }
}

const SDK_VERSION = process.env.NEXT_PUBLIC_DIGIO_WEB_SDK_VERSION || "v11";

const DEFAULT_THEME = {
  primaryColor: "#1e3a5f",
  secondaryColor: "#111827",
};

const DEFAULT_LOGO = "/api/site/logo";

/** Official script URLs — production uses app.digio.in; sandbox uses ext-app.digio.in */
export function getDigioWebSdkScriptUrl(environment: DigioWebSdkEnvironment): string {
  if (environment === "sandbox") {
    return `https://ext-app.digio.in/sdk/${SDK_VERSION}/digio.js`;
  }
  return `https://app.digio.in/sdk/${SDK_VERSION}/digio.js`;
}

const loadPromises = new Map<string, Promise<void>>();

export function loadDigioWebSdk(environment: DigioWebSdkEnvironment): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Digio) return Promise.resolve();

  const scriptUrl = getDigioWebSdkScriptUrl(environment);
  const existing = loadPromises.get(scriptUrl);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const tag = document.querySelector(`script[src="${scriptUrl}"]`);
    if (tag) {
      tag.addEventListener("load", () => resolve());
      tag.addEventListener("error", () => reject(new Error("Failed to load Digio Web SDK")));
      if (window.Digio) resolve();
      return;
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Digio Web SDK"));
    document.body.appendChild(script);
  });

  loadPromises.set(scriptUrl, promise);
  return promise;
}

export function buildDigioVerificationRedirectUrl(nextPath: string): string {
  if (typeof window === "undefined") {
    return `/verification/complete?next=${encodeURIComponent(nextPath)}`;
  }
  const origin = window.location.origin.replace(/\/$/, "");
  return `${origin}/verification/complete?next=${encodeURIComponent(nextPath)}`;
}

/** Prefer redirection on mobile for camera / liveness; iframe on larger screens. */
function preferRedirectionApproach(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_DIGIO_WEB_REDIRECT === "true") return true;
  if (process.env.NEXT_PUBLIC_DIGIO_WEB_REDIRECT === "false") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

export async function launchDigioWebKyc(input: {
  environment: DigioWebSdkEnvironment;
  requestId: string;
  customerIdentifier: string;
  accessToken?: string | null;
  redirectNextPath?: string;
  logoUrl?: string;
  onComplete?: (response: DigioWebSdkCallbackResponse) => void;
}): Promise<DigioWebSdkInstance> {
  await loadDigioWebSdk(input.environment);

  if (!window.Digio) {
    throw new Error("Digio Web SDK is not available after loading the script");
  }

  const useRedirect = preferRedirectionApproach();
  const redirectNext = input.redirectNextPath || "/applicant/verification";

  const digio = new window.Digio({
    environment: input.environment,
    logo: input.logoUrl || DEFAULT_LOGO,
    theme: DEFAULT_THEME,
    ...(useRedirect
      ? {
          is_redirection_approach: true,
          redirect_url: buildDigioVerificationRedirectUrl(redirectNext),
        }
      : {
          is_iframe: true,
        }),
    callback: (response) => {
      input.onComplete?.(response);
    },
  });

  digio.init();
  digio.submit(
    input.requestId,
    input.customerIdentifier,
    input.accessToken?.trim() || undefined
  );

  return digio;
}

export function isDigioWebCallbackSuccess(response: DigioWebSdkCallbackResponse): boolean {
  return !response?.error_code;
}
