/**
 * Prevent Render free-tier web services from spinning down due to inactivity.
 * Same pattern as seminar.vaidyagogate.org (lib/render-keepalive.js).
 *
 * Disable: DISABLE_RENDER_KEEPALIVE=1
 * Interval: RENDER_KEEPALIVE_INTERVAL_MS (default 10 min; Render sleeps after ~15 min idle)
 */

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
const MIN_INTERVAL_MS = 60_000;
const PING_TIMEOUT_MS = 25_000;

let timer = null;
let started = false;

export function isRenderHost() {
  return process.env.RENDER === "true" || Boolean(process.env.RENDER_EXTERNAL_URL?.trim());
}

function resolvePingUrl() {
  const raw =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.KEEPALIVE_URL?.replace(/\/api\/health\/?$/, "") ||
    "";

  const base = String(raw).trim().replace(/\/+$/, "");
  if (!base) return null;
  if (!/^https?:\/\//i.test(base)) return `https://${base}/api/health`;
  return `${base}/api/health`;
}

export function shouldRunRenderKeepalive() {
  if (
    process.env.DISABLE_RENDER_KEEPALIVE === "1" ||
    process.env.DISABLE_RENDER_KEEPALIVE === "true" ||
    process.env.SELF_KEEPALIVE_ENABLED === "false"
  ) {
    return false;
  }
  if (!isRenderHost()) return false;
  if (process.env.NODE_ENV !== "production" && !process.env.RENDER_EXTERNAL_URL) return false;
  return Boolean(resolvePingUrl());
}

function resolveIntervalMs() {
  const parsed = Number.parseInt(process.env.RENDER_KEEPALIVE_INTERVAL_MS || "", 10);
  if (Number.isFinite(parsed)) {
    return Math.max(MIN_INTERVAL_MS, parsed);
  }
  const legacy = Number.parseInt(process.env.KEEPALIVE_INTERVAL_MS || "", 10);
  if (Number.isFinite(legacy)) {
    return Math.max(MIN_INTERVAL_MS, legacy);
  }
  return DEFAULT_INTERVAL_MS;
}

export async function pingRenderKeepaliveOnce() {
  const url = resolvePingUrl();
  if (!url) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { "User-Agent": "vgmf-fellowship-render-keepalive" },
    });

    if (response.status >= 200 && response.status < 300) {
      console.log("[render-keepalive] ping ok", response.status, url);
      return true;
    }

    console.warn("[render-keepalive] ping unexpected status", response.status, url);
    return false;
  } catch (error) {
    console.warn(
      "[render-keepalive] ping failed:",
      error instanceof Error ? error.message : error
    );
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Start periodic self-ping (call once after the HTTP server is listening). */
export function startRenderKeepalive() {
  if (timer || started) return;
  if (!shouldRunRenderKeepalive()) return;

  const url = resolvePingUrl();
  if (!url) return;

  started = true;
  const intervalMs = resolveIntervalMs();

  console.log(
    `[render-keepalive] enabled — pinging ${url} every ${Math.round(intervalMs / 60_000)} min`
  );

  setTimeout(() => {
    void pingRenderKeepaliveOnce();
  }, 15_000);

  timer = setInterval(() => {
    void pingRenderKeepaliveOnce();
  }, intervalMs);

  if (typeof timer.unref === "function") timer.unref();
}

export function stopRenderKeepalive() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  started = false;
}
