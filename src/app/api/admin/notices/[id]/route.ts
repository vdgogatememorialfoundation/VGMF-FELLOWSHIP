import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatNoticeForAdmin } from "@/lib/notice-assets";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const body = await request.json();
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive boolean is required" }, { status: 400 });
    }

    const notice = await prisma.notice.update({
      where: { id },
      data: { isActive: body.isActive },
    });

    revalidatePath("/");
    revalidatePath("/api/cms");

    return NextResponse.json({
      notice: formatNoticeForAdmin(notice),
      message: body.isActive
        ? "Notice is now live on the public site."
        : "Notice hidden from the public site.",
    });
  } catch (error) {
    console.error("Notice patch error:", error);
    return NextResponse.json({ error: "Failed to update notice" }, { status: 404 });
  }
}
