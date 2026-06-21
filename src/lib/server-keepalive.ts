const MIN_INTERVAL_MS = 30_000;
const DEFAULT_INTERVAL_MS = 12 * 60 * 1000;
const MAX_INTERVAL_MS = 14 * 60 * 1000;

const DEFAULT_KEEPALIVE_PATHS = ["/api/health", "/robots.txt", "/sitemap.xml", "/"];

let started = false;
let urlIndex = 0;

function resolveKeepAliveUrls(): string[] {
  const list = process.env.KEEPALIVE_URLS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (list?.length) return list;

  const explicit = process.env.KEEPALIVE_URL?.trim();
  if (explicit) return [explicit];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl && !appUrl.includes("localhost") && !appUrl.includes("127.0.0.1")) {
    const base = appUrl.replace(/\/$/, "");
    return DEFAULT_KEEPALIVE_PATHS.map((path) => `${base}${path}`);
  }

  const port = process.env.PORT || "10000";
  const localBase = `http://127.0.0.1:${port}`;
  return DEFAULT_KEEPALIVE_PATHS.map((path) => `${localBase}${path}`);
}

function resolveIntervalMs(): number {
  const raw = process.env.KEEPALIVE_INTERVAL_MS?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      return Math.min(Math.max(parsed, MIN_INTERVAL_MS), MAX_INTERVAL_MS);
    }
  }
  return DEFAULT_INTERVAL_MS;
}

async function pingKeepAlive(url: string): Promise<void> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { "User-Agent": "vgmf-fellowship-keepalive" },
  });

  console.log(
    `[keepalive] ${new Date().toISOString()} status=${response.status} url=${url}`
  );
}

/** Self-ping loop so Render free tier stays warm between user visits. */
export function startServerKeepAlive(): void {
  if (started) return;
  if (process.env.SELF_KEEPALIVE_ENABLED === "false") return;
  if (process.env.NODE_ENV !== "production") return;

  started = true;
  const urls = resolveKeepAliveUrls();
  const intervalMs = resolveIntervalMs();

  const run = () => {
    const url = urls[urlIndex % urls.length];
    urlIndex += 1;
    pingKeepAlive(url).catch((error) => {
      console.error(
        `[keepalive] ${new Date().toISOString()} failed:`,
        error instanceof Error ? error.message : error
      );
    });
  };

  // Wait for Next.js to finish binding the port before the first ping.
  setTimeout(run, 8_000);
  setInterval(run, intervalMs);

  console.log(`[keepalive] enabled interval=${intervalMs}ms urls=${urls.join(", ")}`);
}
