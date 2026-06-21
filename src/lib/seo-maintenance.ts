import prisma from "./db";

/** Keep production indexing on when Render env forces it. */
export async function ensureProductionSeoIndexing(): Promise<void> {
  if (process.env.SEO_INDEXING_ENABLED?.trim().toLowerCase() !== "true") return;

  await prisma.siteSettings.updateMany({
    where: { id: "default", seoIndexingEnabled: false },
    data: { seoIndexingEnabled: true },
  });
}
