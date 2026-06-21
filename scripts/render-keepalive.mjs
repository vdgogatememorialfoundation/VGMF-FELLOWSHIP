/**
 * Prevent Render free-tier web services from spinning down due to inactivity.
 * Periodically hits this app's public /api/health URL (outbound → inbound request).
 *
 * Continuous (background with start:render):
 *   node scripts/render-keepalive.mjs
 *
 * Single ping (Render cron job — use --once):
 *   node scripts/render-keepalive.mjs --once
 */

import {
  pingRenderKeepaliveOnce,
  shouldRunRenderKeepalive,
  startRenderKeepalive,
} from "../lib/render-keepalive.mjs";

const once = process.argv.includes("--once");

if (once) {
  if (!shouldRunRenderKeepalive() && !process.env.PUBLIC_BASE_URL && !process.env.RENDER_EXTERNAL_URL) {
    console.warn("[render-keepalive] skipped — not on Render / no PUBLIC_BASE_URL");
    process.exit(0);
  }
  const ok = await pingRenderKeepaliveOnce();
  process.exit(ok ? 0 : 1);
}

if (!shouldRunRenderKeepalive()) {
  console.warn("[render-keepalive] daemon skipped — DISABLE_RENDER_KEEPALIVE or not on Render");
  process.exit(0);
}

startRenderKeepalive();
console.log("[render-keepalive] daemon running (same pattern as seminar.vaidyagogate.org)");
