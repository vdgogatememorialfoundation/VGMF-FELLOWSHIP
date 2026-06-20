import type { Metadata } from "next";
import { PublicHeader, PublicFooter } from "@/components/public/PublicLayout";
import { PublicMaintenanceGate } from "@/components/public/PublicMaintenanceGate";
import { getCmsPage, getSiteSettings } from "@/lib/cms";
import { buildPageMetadata, getPublicSiteUrl } from "@/lib/seo";
import { resolveSeoConfig } from "@/lib/seo-config";
import { notFound } from "next/navigation";
import type { CmsPageSlug } from "@prisma/client";

const SLUG_MAP: Record<string, CmsPageSlug> = {
  about: "ABOUT",
  terms: "TERMS",
  undertaking: "UNDERTAKING",
  rulebook: "RULEBOOK",
  privacy: "PRIVACY",
  "refund-policy": "REFUND",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cmsSlug = SLUG_MAP[slug];
  if (!cmsSlug) return {};

  const page = await getCmsPage(cmsSlug);
  if (!page || !page.isPublished) return {};

  const siteUrl = await getPublicSiteUrl();
  const plainText = page.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const siteSettings = await getSiteSettings();
  const seo = resolveSeoConfig(siteSettings);

  return buildPageMetadata({
    title: page.title,
    description: plainText.slice(0, 160) || `${page.title} — VGMF Fellowship Portal`,
    path: `/${slug}`,
    siteUrl,
    indexingEnabled: seo.indexingEnabled,
  });
}

export default async function CmsPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cmsSlug = SLUG_MAP[slug];
  if (!cmsSlug) notFound();

  const page = await getCmsPage(cmsSlug);
  if (!page || !page.isPublished) notFound();

  return (
    <PublicMaintenanceGate>
    <div className="min-h-screen mesh-bg">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-5 py-16 sm:px-6 md:py-20">
        <span className="section-badge">Foundation</span>
        <h1 className="section-title mt-4">{page.title}</h1>
        <div
          className="prose prose-green mt-10 max-w-none rounded-3xl border border-[#e4ede8] bg-white p-8 text-ink-soft shadow-sm prose-headings:font-display prose-headings:font-bold md:p-10"
          dangerouslySetInnerHTML={{ __html: page.content.replace(/\n/g, "<br/>") }}
        />
      </main>
      <PublicFooter />
    </div>
    </PublicMaintenanceGate>
  );
}
