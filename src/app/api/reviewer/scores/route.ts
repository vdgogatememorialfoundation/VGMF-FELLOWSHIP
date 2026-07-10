import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

const ALLOWED_ROLES = new Set(["ADMIN", "STAFF", "COADMIN", "COMMITTEE"]);

// GET - Get all applications assigned to reviewer
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reviewerId = user.id;
    const reviewerName = user.profile?.name || user.email;

    // Get scoring criteria
    const criteria = await prisma.scoringCriteria.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    // Get applications (for committee members, filter by assignments)
    const whereClause: Record<string, unknown> = {
      status: {
        in: [
          "SCRUTINY_APPROVED",
          "SUBMITTED",
          "UNDER_REVIEW",
          "TECHNICAL_SCORING",
          "QUERY_RAISED",
          "QUERY_RESPONDED",
        ],
      },
    };

    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        researchProposal: true,
        applicationScores: {
          where: { reviewerId },
          include: {
            scores: {
              orderBy: { criteriaName: "asc" },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const applicationsWithScores = applications.map((app) => {
      const myScore = app.applicationScores[0];
      const maxPossibleScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);

      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        name: app.name,
        email: app.email,
        status: app.status,
        submittedAt: app.submittedAt,
        projectTitle: app.researchProposal?.projectTitle || "",
        researchArea: app.researchProposal?.researchArea || "",
        
        myScore: myScore ? {
          id: myScore.id,
          isSubmitted: myScore.isSubmitted,
          isLocked: myScore.isLocked,
          totalScore: myScore.totalScore,
          maxPossibleScore: myScore.maxPossibleScore,
          remarks: myScore.remarks,
          scores: myScore.scores.map(c => ({
            criteriaId: c.criteriaId,
            criteriaName: c.criteriaName,
            criteriaDescription: c.criteriaDescription,
            maxScore: c.maxScore,
            score: c.score,
          })),
        } : null,
        
        maxPossibleScore,
      };
    });

    return NextResponse.json({
      applications: applicationsWithScores,
      criteria,
    });
  } catch (error) {
    console.error("Error fetching reviewer scores:", error);
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }
}

// POST - Save or submit/lock score
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { applicationId, scores, remarks, submit, lock } = body;

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
    }

    if (!scores || !Array.isArray(scores)) {
      return NextResponse.json({ error: "scores array is required" }, { status: 400 });
    }

    const reviewerId = user.id;
    const reviewerName = user.profile?.name || user.email;

    // Get application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Get criteria
    const criteria = await prisma.scoringCriteria.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    // Calculate total and max possible
    const maxPossibleScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);
    const totalScore = scores.reduce((sum, s) => sum + (s.score || 0), 0);

    // Check if score already exists
    let existingScore = await prisma.applicationScore.findUnique({
      where: {
        applicationId_reviewerId: {
          applicationId,
          reviewerId,
        },
      },
    });

    // Check if locked and not admin
    if (existingScore?.isLocked && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Score is locked. Contact admin to unlock." }, { status: 403 });
    }

    // Check if submitted and not admin
    if (existingScore?.isSubmitted && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Score already submitted. Contact admin to modify." }, { status: 403 });
    }

    // Create or update score
    let score = existingScore;
    
    if (!existingScore) {
      // Create new score
      score = await prisma.applicationScore.create({
        data: {
          applicationId,
          reviewerId,
          reviewerName,
          maxPossibleScore,
          totalScore,
          isSubmitted: submit || false,
          isLocked: lock || false,
          lockedAt: lock ? new Date() : null,
          remarks,
          scores: {
            create: scores.map((s: { criteriaId: string; score: number }) => {
              const criteriaItem = criteria.find(c => c.id === s.criteriaId);
              return {
                criteriaId: s.criteriaId,
                criteriaName: criteriaItem?.name || "",
                criteriaDescription: criteriaItem?.description || "",
                maxScore: criteriaItem?.maxScore || 0,
                score: s.score || 0,
              };
            }),
          },
        },
        include: {
          scores: true,
        },
      });
    } else {
      // Update existing score - delete old items and create new ones
      await prisma.applicationScoreItem.deleteMany({
        where: { scoreId: existingScore.id },
      });

      score = await prisma.applicationScore.update({
        where: { id: existingScore.id },
        data: {
          totalScore,
          isSubmitted: submit ? true : existingScore.isSubmitted,
          isLocked: lock ? true : existingScore.isLocked,
          lockedAt: lock ? new Date() : existingScore.lockedAt,
          remarks,
          scores: {
            create: scores.map((s: { criteriaId: string; score: number }) => {
              const criteriaItem = criteria.find(c => c.id === s.criteriaId);
              return {
                criteriaId: s.criteriaId,
                criteriaName: criteriaItem?.name || "",
                criteriaDescription: criteriaItem?.description || "",
                maxScore: criteriaItem?.maxScore || 0,
                score: s.score || 0,
              };
            }),
          },
        },
        include: {
          scores: true,
        },
      });
    }

    // Update application status if submitted
    if (submit && application.status === "UNDER_REVIEW") {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: "TECHNICAL_SCORING",
          statusHistory: {
            create: {
              fromStatus: "UNDER_REVIEW",
              toStatus: "TECHNICAL_SCORING",
              changedBy: user.id,
              notes: `Score submitted by ${reviewerName}: ${totalScore}/${maxPossibleScore}`,
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      score,
      message: submit ? "Score submitted and locked successfully" : "Score saved successfully",
    });
  } catch (error) {
    console.error("Error saving score:", error);
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
  }
}
