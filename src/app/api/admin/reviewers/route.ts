import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const phase = request.nextUrl.searchParams.get("phase");

  const reviewers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: phase === "TRUSTEE" ? "TRUSTEE" : phase === "COMMITTEE" ? "COMMITTEE" : { in: ["COMMITTEE", "TRUSTEE"] },
    },
    include: { profile: true },
    orderBy: { email: "asc" },
  });

  return NextResponse.json({
    reviewers: reviewers.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.profile?.name ?? r.email,
      role: r.role,
    })),
  });
}
