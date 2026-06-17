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
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
        <div
          className="prose prose-green mt-8 max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: page.content.replace(/\n/g, "<br/>") }}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
