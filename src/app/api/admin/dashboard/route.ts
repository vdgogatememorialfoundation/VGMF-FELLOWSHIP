import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF", "COADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reviewStatuses = [
    "SCRUTINY",
    "ELIGIBILITY_CHECK",
    "UNDER_REVIEW",
    "TECHNICAL_SCORING",
    "QUERY_RAISED",
  ] as const;

  const [
    totalApplications,
    underReview,
    shortlisted,
    selected,
    activeFellows,
    completedProjects,
    fundsSanctioned,
    fundsReleased,
    pendingRelease,
    statusBreakdown,
  ] = await Promise.all([
    prisma.application.count(),
    prisma.application.count({ where: { status: { in: [...reviewStatuses] } } }),
    prisma.application.count({
      where: { status: { in: ["SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"] } },
    }),
    prisma.application.count({
      where: { status: { in: ["SELECTED", "AGREEMENT_PENDING", "COMPLETED"] } },
    }),
    prisma.fellowship.count({ where: { isActive: true, isCompleted: false } }),
    prisma.fellowship.count({ where: { isCompleted: true } }),
    prisma.financeRecord.aggregate({ _sum: { sanctionedAmount: true } }),
    prisma.fundInstallment.aggregate({
      where: { status: "RELEASED" },
      _sum: { amount: true },
    }),
    prisma.fundInstallment.aggregate({
      where: { status: { in: ["PENDING", "APPROVED"] } },
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
      fundsSanctioned: fundsSanctioned._sum.sanctionedAmount ?? 0,
      fundsReleased: fundsReleased._sum.amount ?? 0,
      pendingReleases: pendingRelease._sum.amount ?? 0,
    },
    statusBreakdown,
  });
}
