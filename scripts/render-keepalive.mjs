/**
 * Ping the deployed app so Render free tier stays warm.
 *
 * Continuous (local or external runner):
 *   KEEPALIVE_URLS=https://fellowship.vaidyagogate.org/api/health,https://fellowship.vaidyagogate.org/sitemap.xml node scripts/render-keepalive.mjs
 *
 * Single ping (Render cron job — use --once):
 *   node scripts/render-keepalive.mjs --once
 */

const DEFAULT_URLS = [
  "https://fellowship.vaidyagogate.org/api/health",
  "https://fellowship.vaidyagogate.org/sitemap.xml",
  "https://fellowship.vaidyagogate.org/",
];

const DEFAULT_INTERVAL_MS = 30_000;

function resolveUrls() {
  const list = process.env.KEEPALIVE_URLS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (list?.length) return list;

  const single = process.env.KEEPALIVE_URL?.trim();
  if (single) return [single];

  return DEFAULT_URLS;
}

const urls = resolveUrls();
const intervalMs = Number.parseInt(
  process.env.KEEPALIVE_INTERVAL_MS || String(DEFAULT_INTERVAL_MS),
  10
);
const interval = Number.isFinite(intervalMs) && intervalMs >= 10_000 ? intervalMs : DEFAULT_INTERVAL_MS;
const once = process.argv.includes("--once");

async function reloadWebsite(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { "User-Agent": "vgmf-fellowship-keepalive" },
    });
    console.log(
      `Reloaded at ${new Date().toISOString()}: ${url} → status ${response.status}`
    );
    if (!response.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      `Error reloading ${url} at ${new Date().toISOString()}:`,
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  }
}

async function pingAll() {
  for (const url of urls) {
    await reloadWebsite(url);
  }
}

if (once) {
  await pingAll();
  process.exit(process.exitCode || 0);
}

await pingAll();
setInterval(pingAll, interval);
console.log(`Keep-alive running every ${interval}ms → ${urls.join(", ")}`);
