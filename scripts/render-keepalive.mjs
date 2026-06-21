/**
 * Ping the deployed app so Render free tier stays warm.
 *
 * Continuous (local or external runner):
 *   KEEPALIVE_URL=https://fellowship.vaidyagogate.org/api/health node scripts/render-keepalive.mjs
 *
 * Single ping (Render cron job — use --once):
 *   node scripts/render-keepalive.mjs --once
 */

const DEFAULT_URL = "https://fellowship.vaidyagogate.org/api/health";
const DEFAULT_INTERVAL_MS = 30_000;

const url = (process.env.KEEPALIVE_URL || DEFAULT_URL).trim();
const intervalMs = Number.parseInt(
  process.env.KEEPALIVE_INTERVAL_MS || String(DEFAULT_INTERVAL_MS),
  10
);
const interval = Number.isFinite(intervalMs) && intervalMs >= 10_000 ? intervalMs : DEFAULT_INTERVAL_MS;
const once = process.argv.includes("--once");

async function reloadWebsite() {
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { "User-Agent": "vgmf-fellowship-keepalive" },
    });
    console.log(
      `Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`
    );
    if (!response.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      `Error reloading at ${new Date().toISOString()}:`,
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  }
}

if (once) {
  await reloadWebsite();
  process.exit(process.exitCode || 0);
}

await reloadWebsite();
setInterval(reloadWebsite, interval);
console.log(`Keep-alive running every ${interval}ms → ${url}`);
