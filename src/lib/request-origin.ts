import type { NextRequest } from "next/server";
import { normalizeAppUrl } from "./integrations";

function isInternalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "0.0.0.0" ||
    host === "127.0.0.1" ||
    host === "localhost" ||
    host.endsWith(".internal")
  );
}

/** Public site origin for redirects behind Render/reverse proxies. */
export function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    if (host) {
      const hostname = host.split(":")[0] || "";
      if (!isInternalHostname(hostname)) {
        const proto = (forwardedProto?.split(",")[0]?.trim() || "https").replace(/:$/, "");
        return `${proto}://${host}`;
      }
    }
  }

  const hostHeader = request.headers.get("host");
  if (hostHeader) {
    const hostname = hostHeader.split(":")[0] || "";
    if (!isInternalHostname(hostname)) {
      const proto =
        forwardedProto?.split(",")[0]?.trim()?.replace(/:$/, "") ||
        request.nextUrl.protocol.replace(":", "") ||
        "https";
      return `${proto}://${hostHeader}`;
    }
  }

  return normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
}

export function buildPublicUrl(request: NextRequest, path: string): URL {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, getPublicOrigin(request));
}
