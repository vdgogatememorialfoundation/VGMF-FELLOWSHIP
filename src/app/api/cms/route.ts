import { NextResponse } from "next/server";
import { getSiteSettings, getActiveNotices } from "@/lib/cms";
import prisma from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

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
