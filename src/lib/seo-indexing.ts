const OFFICIAL_PRODUCTION_BASE = "https://fellowship.vaidyagogate.org";

/** Whether public pages should be indexable (robots.txt, CMS sync). */
export function isSeoIndexingEnabled(): boolean {
  const envFlag = process.env.SEO_INDEXING_ENABLED?.trim().toLowerCase();
  if (envFlag === "true") return true;
  if (envFlag === "false") return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "").toLowerCase();
  return appUrl === OFFICIAL_PRODUCTION_BASE;
}
