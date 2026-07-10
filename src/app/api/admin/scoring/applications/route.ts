import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

const ALLOWED_ROLES = new Set(["ADMIN", "STAFF", "COADMIN"]);

// GET - Get single application with all scores
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
    }

    // Get scoring criteria
    const criteria = await prisma.scoringCriteria.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: { include: { profile: true } },
        researchProposal: true,
        budget: true,
        committeeScores: {
          include: {
            committeeUser: { include: { profile: true } },
          },
        },
        applicationScores: {
          include: {
            scores: {
              orderBy: { criteriaName: "asc" },
            },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Get reviewers (committee members)
    const reviewers = await prisma.user.findMany({
      where: { role: "COMMITTEE" },
      include: { profile: true },
    });

    // Calculate criteria statistics
    const criteriaStats = criteria.map((c) => {
      const allScores = application.applicationScores
        .filter(s => s.isSubmitted)
        .flatMap(s => s.scores)
        .filter(sc => sc.criteriaId === c.id);

      const avg = allScores.length > 0
        ? allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length
        : null;

      const min = allScores.length > 0
        ? Math.min(...allScores.map(s => s.score))
        : null;

      const max = allScores.length > 0
        ? Math.max(...allScores.map(s => s.score))
        : null;

      const variance = allScores.length > 1
        ? (() => {
            const mean = allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length;
            const squaredDiffs = allScores.map(s => Math.pow(s.score - mean, 2));
            return squaredDiffs.reduce((sum, d) => sum + d, 0) / allScores.length;
          })()
        : null;

      return {
        criteriaId: c.id,
        criteriaName: c.name,
        criteriaDescription: c.description,
        maxScore: c.maxScore,
        averageScore: avg,
        minScore: min,
        maxScore: max,
        variance: variance,
        stdDev: variance !== null ? Math.sqrt(variance) : null,
        scoreCount: allScores.length,
      };
    });

    // Calculate application-level statistics
    const submittedScores = application.applicationScores.filter(s => s.isSubmitted);
    const overallAvg = submittedScores.length > 0
      ? submittedScores.reduce((sum, s) => sum + s.totalScore, 0) / submittedScores.length
      : null;

    const maxPossible = criteria.reduce((sum, c) => sum + c.maxScore, 0);

    return NextResponse.json({
      application: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        name: application.name,
        email: application.email,
        mobile: application.mobile,
        status: application.status,
        submittedAt: application.submittedAt,
        projectTitle: application.researchProposal?.projectTitle || "",
        researchArea: application.researchProposal?.researchArea || "",
        city: application.city,
        state: application.state,
        bamsCollege: application.bamsCollege,
        currentDesignation: application.currentDesignation,
        institutionName: application.institutionName,
      },
      criteria,
      criteriaStats,
      reviewers,
      scores: application.applicationScores.map(s => ({
        id: s.id,
        reviewerId: s.reviewerId,
        reviewerName: s.reviewerName,
        isSubmitted: s.isSubmitted,
        isLocked: s.isLocked,
        lockedAt: s.lockedAt,
        totalScore: s.totalScore,
        maxPossibleScore: s.maxPossibleScore,
        remarks: s.remarks,
        scores: s.scores.map(c => ({
          id: c.id,
          criteriaId: c.criteriaId,
          criteriaName: c.criteriaName,
          criteriaDescription: c.criteriaDescription,
          maxScore: c.maxScore,
          score: c.score,
        })),
      })),
      statistics: {
        totalReviewers: application.applicationScores.length,
        submittedReviewers: submittedScores.length,
        lockedReviewers: application.applicationScores.filter(s => s.isLocked).length,
        overallAverage: overallAvg,
        maxPossibleScore: maxPossible,
        averagePercentage: overallAvg !== null ? (overallAvg / maxPossible * 100) : null,
      },
    });
  } catch (error) {
    console.error("Error fetching application scores:", error);
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }
}

// PATCH - Admin actions on scores (unlock, etc.)
export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { scoreId, action, applicationId } = body;

    if (!scoreId || !action) {
      return NextResponse.json({ error: "scoreId and action are required" }, { status: 400 });
    }

    if (action === "unlock") {
      // Unlock a submitted/locked score
      const score = await prisma.applicationScore.findUnique({
        where: { id: scoreId },
      });

      if (!score) {
        return NextResponse.json({ error: "Score not found" }, { status: 404 });
      }

      const updated = await prisma.applicationScore.update({
        where: { id: scoreId },
        data: {
          isLocked: false,
          lockedAt: null,
        },
      });

      return NextResponse.json({ success: true, score: updated });
    }

    if (action === "relock") {
      // Re-lock a score
      const updated = await prisma.applicationScore.update({
        where: { id: scoreId },
        data: {
          isLocked: true,
          lockedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, score: updated });
    }

    if (action === "delete") {
      // Delete a score
      const score = await prisma.applicationScore.findUnique({
        where: { id: scoreId },
      });

      if (!score) {
        return NextResponse.json({ error: "Score not found" }, { status: 404 });
      }

      if (score.isLocked && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Cannot delete locked score" }, { status: 403 });
      }

      await prisma.applicationScoreItem.deleteMany({
        where: { scoreId },
      });

      await prisma.applicationScore.delete({
        where: { id: scoreId },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "add_reviewer") {
      // Add a new reviewer score
      if (!applicationId) {
        return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
      }

      const { reviewerId, reviewerName } = body;

      if (!reviewerId || !reviewerName) {
        return NextResponse.json({ error: "reviewerId and reviewerName are required" }, { status: 400 });
      }

      // Check if reviewer already has a score
      const existing = await prisma.applicationScore.findUnique({
        where: {
          applicationId_reviewerId: {
            applicationId,
            reviewerId,
          },
        },
      });

      if (existing) {
        return NextResponse.json({ error: "Reviewer already has a score for this application" }, { status: 400 });
      }

      // Get criteria
      const criteria = await prisma.scoringCriteria.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });

      const maxPossibleScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);

      // Create score with empty items
      const score = await prisma.applicationScore.create({
        data: {
          applicationId,
          reviewerId,
          reviewerName,
          maxPossibleScore,
          scores: {
            create: criteria.map(c => ({
              criteriaId: c.id,
              criteriaName: c.name,
              criteriaDescription: c.description,
              maxScore: c.maxScore,
              score: 0,
            })),
          },
        },
        include: {
          scores: true,
        },
      });

      return NextResponse.json({ success: true, score });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating score:", error);
    return NextResponse.json({ error: "Failed to update score" }, { status: 500 });
  }
}
