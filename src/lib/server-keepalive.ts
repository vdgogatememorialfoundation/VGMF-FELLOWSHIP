const MIN_INTERVAL_MS = 30_000;
const DEFAULT_INTERVAL_MS = 12 * 60 * 1000;
const MAX_INTERVAL_MS = 14 * 60 * 1000;

let started = false;

function resolveKeepAliveUrl(): string {
  const explicit = process.env.KEEPALIVE_URL?.trim();
  if (explicit) return explicit;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl && !appUrl.includes("localhost") && !appUrl.includes("127.0.0.1")) {
    return `${appUrl.replace(/\/$/, "")}/api/health`;
  }

  const port = process.env.PORT || "10000";
  return `http://127.0.0.1:${port}/api/health`;
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
  const url = resolveKeepAliveUrl();
  const intervalMs = resolveIntervalMs();

  const run = () => {
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

  console.log(`[keepalive] enabled interval=${intervalMs}ms url=${url}`);
}
