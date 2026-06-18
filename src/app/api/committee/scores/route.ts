import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { scoreSchema } from "@/lib/validations";
import { getAssignedApplicationIds } from "@/lib/review-workflow";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "COMMITTEE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { applicationId, ...scoreData } = body;
    const parsed = scoreSchema.safeParse(scoreData);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const totalScore =
      d.scientificMerit +
      d.innovation +
      d.feasibility +
      d.budgetJustification +
      d.viddhakarmaRelevance;

    const score = await prisma.committeeScore.upsert({
      where: {
        applicationId_committeeUserId: {
          applicationId,
          committeeUserId: user.id,
        },
      },
      update: { ...d, totalScore },
      create: {
        applicationId,
        committeeUserId: user.id,
        ...d,
        totalScore,
      },
    });

    if (d.remarks) {
      await prisma.committeeRemark.create({
        data: {
          applicationId,
          committeeUserId: user.id,
          remark: d.remarks,
        },
      });
    }

    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    if (app?.status === "UNDER_REVIEW") {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: "TECHNICAL_SCORING",
          statusHistory: {
            create: {
              fromStatus: "UNDER_REVIEW",
              toStatus: "TECHNICAL_SCORING",
              changedBy: user.id,
              notes: `Technical score submitted: ${totalScore}/100`,
            },
          },
        },
      });
    }

    return NextResponse.json({ success: true, score });
  } catch (error) {
    console.error("Scoring error:", error);
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
  }
}

export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "COMMITTEE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignedIds = await getAssignedApplicationIds(user.id, "COMMITTEE");

  const applications = await prisma.application.findMany({
    where: {
      id: { in: assignedIds.length > 0 ? assignedIds : [] },
      status: {
        in: [
          "SCRUTINY",
          "SCRUTINY_APPROVED",
          "SUBMITTED",
          "UNDER_REVIEW",
          "TECHNICAL_SCORING",
          "SHORTLISTED",
          "QUERY_RAISED",
          "QUERY_RESPONDED",
        ],
      },
    },
    include: {
      user: { include: { profile: true } },
      researchProposal: true,
      budget: true,
      committeeScores: true,
      applicationQueries: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { submittedAt: "desc" },
  });

  const ranked = applications
    .map((app) => {
      const avgScore =
        app.committeeScores.length > 0
          ? app.committeeScores.reduce((sum, s) => sum + s.totalScore, 0) /
            app.committeeScores.length
          : 0;
      return { ...app, averageScore: avgScore };
    })
    .sort((a, b) => b.averageScore - a.averageScore);

  return NextResponse.json({ applications: ranked });
}
