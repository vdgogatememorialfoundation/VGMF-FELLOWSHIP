/**
 * Writes public/sitemap.xml and public/robots.txt at build time.
 * Static files avoid Next.js cold-start failures when Google fetches them.
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

function buildRobotsTxt(base) {
  return `# VGMF Fellowship Portal — allow all public pages
User-agent: Googlebot
Allow: /

User-agent: Google-InspectionTool
Allow: /

User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
}

const base = resolveBaseUrl();
const outDir = path.join(root, "public");

await mkdir(outDir, { recursive: true });

const sitemapFile = path.join(outDir, "sitemap.xml");
const robotsFile = path.join(outDir, "robots.txt");

await writeFile(sitemapFile, buildSitemapXml(base), "utf8");
await writeFile(robotsFile, buildRobotsTxt(base), "utf8");

console.log(`Generated ${sitemapFile} (${2 + PUBLIC_CMS_SLUGS.length} URLs)`);
console.log(`Generated ${robotsFile}`);
