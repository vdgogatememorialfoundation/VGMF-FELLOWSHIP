/**
 * Writes public/sitemap.xml and public/robots.txt at build time.
 * Static files avoid Next.js route cold-start failures when Google fetches them.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const OFFICIAL_PRODUCTION_BASE = "https://fellowship.vaidyagogate.org";
const PUBLIC_CMS_SLUGS = [
  "about",
  "terms",
  "undertaking",
  "rulebook",
  "privacy",
  "refund-policy",
];

// Portal paths use X-Robots-Tag: noindex (see next.config.ts), not robots.txt disallows.

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveBaseUrl() {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || OFFICIAL_PRODUCTION_BASE).trim();
  return raw.replace(/\/$/, "");
}

function isIndexingEnabled(base) {
  const envFlag = process.env.SEO_INDEXING_ENABLED?.trim().toLowerCase();
  if (envFlag === "true") return true;
  if (envFlag === "false") return false;
  return base === OFFICIAL_PRODUCTION_BASE;
}

function buildSitemapXml(base) {
  const lastmod = new Date().toISOString();
  const entries = [
    { loc: `${base}/`, priority: "1.0", changefreq: "weekly" },
    { loc: `${base}/register`, priority: "0.9", changefreq: "weekly" },
    ...PUBLIC_CMS_SLUGS.map((slug) => ({
      loc: `${base}/${slug}`,
      priority: "0.7",
      changefreq: "monthly",
    })),
  ];

  const body = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function buildRobotsTxt(base, indexingEnabled) {
  if (!indexingEnabled) {
    return ["User-agent: *", "Disallow: /", "", `Sitemap: ${base}/sitemap.xml`, ""].join("\n");
  }

  // Allow all crawlers; portal routes are excluded via noindex headers instead of Disallow.
  return ["User-agent: *", "", `Sitemap: ${base}/sitemap.xml`, ""].join("\n");
}

const base = resolveBaseUrl();
const indexingEnabled = isIndexingEnabled(base);
const outDir = path.join(root, "public");

await mkdir(outDir, { recursive: true });

const sitemapFile = path.join(outDir, "sitemap.xml");
const robotsFile = path.join(outDir, "robots.txt");

await writeFile(sitemapFile, buildSitemapXml(base), "utf8");
await writeFile(robotsFile, buildRobotsTxt(base, indexingEnabled), "utf8");

console.log(
  `Generated SEO static files (base=${base}, indexing=${indexingEnabled ? "on" : "off"})`
);
console.log(`  ${sitemapFile} (${2 + PUBLIC_CMS_SLUGS.length} URLs)`);
console.log(`  ${robotsFile}`);
