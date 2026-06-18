import type { NextRequest } from "next/server";
import { normalizeAppUrl } from "./integrations";

function isInternalHost(host: string): boolean {
  const value = host.toLowerCase().split(":")[0];
  return value === "0.0.0.0" || value === "127.0.0.1" || value === "localhost";
}

/** Public site origin for redirects behind Render/proxy (avoids 0.0.0.0:10000). */
export function getPublicRequestOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return normalizeAppUrl(configured);
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";

  if (forwardedHost && !isInternalHost(forwardedHost)) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = request.headers.get("host")?.trim();
  if (host && !isInternalHost(host)) {
    const proto = request.nextUrl.protocol.replace(":", "") || forwardedProto;
    return `${proto}://${host}`;
  }

  return normalizeAppUrl(undefined);
}

export function buildPublicRedirectUrl(request: NextRequest, path: string): URL {
  const origin = getPublicRequestOrigin(request);
  return new URL(path.startsWith("/") ? path : `/${path}`, origin);
}
