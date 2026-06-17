import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    totalApplications,
    underReview,
    shortlisted,
    selected,
    activeFellows,
    completedProjects,
    fundsReleased,
    statusBreakdown,
  ] = await Promise.all([
    prisma.application.count(),
    prisma.application.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.application.count({ where: { status: "SHORTLISTED" } }),
    prisma.application.count({ where: { status: "SELECTED" } }),
    prisma.fellowship.count({ where: { isActive: true, isCompleted: false } }),
    prisma.fellowship.count({ where: { isCompleted: true } }),
    prisma.fundInstallment.aggregate({
      where: { status: "RELEASED" },
      _sum: { amount: true },
    }),
    prisma.application.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalApplications,
      underReview,
      shortlisted,
      selected,
      activeFellows,
      completedProjects,
      fundsReleased: fundsReleased._sum.amount ?? 0,
    },
    statusBreakdown,
  });
}
