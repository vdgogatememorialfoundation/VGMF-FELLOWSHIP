import { NextResponse } from "next/server";
import { getSiteSettings, getActiveNotices, getCmsPage } from "@/lib/cms";
import prisma from "@/lib/db";
import type { CmsPageSlug } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const slug = searchParams.get("slug") as CmsPageSlug | null;

  if (slug) {
    const page = await getCmsPage(slug);
    return NextResponse.json({ page });
  }

  if (type === "notices") {
    const notices = await getActiveNotices();
    return NextResponse.json({ notices });
  }

  if (type === "pages") {
    const pages = await prisma.cmsPage.findMany({
      where: { isPublished: true },
      select: { slug: true, title: true, updatedAt: true },
    });
    return NextResponse.json({ pages });
  }

  const settings = await getSiteSettings();
  return NextResponse.json({ settings });
}
