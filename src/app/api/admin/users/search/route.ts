import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "COADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      role: "APPLICANT",
      isActive: true,
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { profile: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: {
      id: true,
      email: true,
      profile: { select: { name: true } },
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.profile?.name || "—",
    })),
  });
}
