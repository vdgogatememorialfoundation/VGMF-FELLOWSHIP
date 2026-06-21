import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isApplicationsOpenMessaging } from "@/lib/public-messaging";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

function revalidatePublicSurfaces() {
  revalidatePath("/");
  revalidatePath("/api/cms");
}

/** Hide notice, ticker, and hero badge that claim applications are open. */
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const hideAllNotices = body.hideAllNotices !== false;

    if (hideAllNotices) {
      await prisma.notice.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    } else {
      const activeNotices = await prisma.notice.findMany({
        where: { isActive: true },
        select: { id: true, title: true, content: true },
      });
      const toHide = activeNotices.filter((n) =>
        isApplicationsOpenMessaging(`${n.title} ${n.content}`)
      );
      if (toHide.length > 0) {
        await prisma.notice.updateMany({
          where: { id: { in: toHide.map((n) => n.id) } },
          data: { isActive: false },
        });
      }
    }

    await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: {
        tickerEnabled: false,
        tickerText: "Visit Official Notices for fellowship updates",
        heroBadge: "Fellowship 2026",
      },
      create: {
        id: "default",
        tickerEnabled: false,
        tickerText: "Visit Official Notices for fellowship updates",
        heroBadge: "Fellowship 2026",
      },
    });

    revalidatePublicSurfaces();

    return NextResponse.json({
      success: true,
      message:
        "Applications-open messaging hidden from the public site (notices, ticker, and hero badge).",
    });
  } catch (error) {
    console.error("Hide applications publicity error:", error);
    return NextResponse.json({ error: "Failed to update public messaging" }, { status: 500 });
  }
}
