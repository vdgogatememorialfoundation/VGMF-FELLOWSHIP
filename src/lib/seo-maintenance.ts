import prisma from "./db";
import { isSeoIndexingEnabled } from "./seo-indexing";

/** Keep production indexing on when Render env forces it. */
export async function ensureProductionSeoIndexing(): Promise<void> {
  if (!isSeoIndexingEnabled()) return;

  await prisma.siteSettings.updateMany({
    where: { id: "default", seoIndexingEnabled: false },
    data: { seoIndexingEnabled: true },
  });
}
