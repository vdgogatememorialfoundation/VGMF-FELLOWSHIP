import { PublicHeader, PublicFooter } from "@/components/public/PublicLayout";
import { getCmsPage } from "@/lib/cms";
import { notFound } from "next/navigation";
import type { CmsPageSlug } from "@prisma/client";

const SLUG_MAP: Record<string, CmsPageSlug> = {
  about: "ABOUT",
  terms: "TERMS",
  privacy: "PRIVACY",
  "refund-policy": "REFUND",
};

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
    <div className="min-h-screen mesh-bg">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-5 py-16 sm:px-6">
        <span className="section-badge">Foundation</span>
        <h1 className="section-title mt-4">{page.title}</h1>
        <div
          className="prose prose-green mt-10 max-w-none rounded-3xl border border-[#e4ede8] bg-white p-8 text-ink-soft shadow-sm prose-headings:font-display prose-headings:font-bold"
          dangerouslySetInnerHTML={{ __html: page.content.replace(/\n/g, "<br/>") }}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
