import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { scoreSchema } from "@/lib/validations";

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

  const applications = await prisma.application.findMany({
    where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED"] } },
    include: {
      user: { include: { profile: true } },
      researchProposal: true,
      budget: true,
      committeeScores: true,
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
