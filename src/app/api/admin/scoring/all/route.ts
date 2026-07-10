import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

const ALLOWED_ROLES = new Set(["ADMIN", "STAFF", "COADMIN"]);

// GET - Get all applications with their scores and individual criteria
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const applicationId = searchParams.get("applicationId");
    const status = searchParams.get("status");
    const reviewerId = searchParams.get("reviewerId");

    // Get scoring criteria
    const criteria = await prisma.scoringCriteria.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    // Build where clause
    const whereClause: Record<string, unknown> = {};
    if (applicationId) {
      whereClause.id = applicationId;
    }
    if (status) {
      whereClause.status = status;
    }

    // Fetch applications
    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        user: { include: { profile: true } },
        researchProposal: true,
        committeeScores: {
          include: {
            committeeUser: { include: { profile: true } },
          },
          orderBy: { submittedAt: "asc" },
        },
        applicationScores: {
          include: {
            scores: {
              orderBy: { criteriaName: "asc" },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Calculate statistics for each application
    const applicationsWithStats = applications.map((app) => {
      // Legacy scoring (CommitteeScore)
      const legacyScores = app.committeeScores || [];
      const legacyAvgScore = legacyScores.length > 0
        ? legacyScores.reduce((sum, s) => sum + s.totalScore, 0) / legacyScores.length
        : null;
      const legacySubmittedCount = legacyScores.filter(s => s.isSubmitted).length;

      // New scoring (ApplicationScore)
      const newScores = app.applicationScores || [];
      const newAvgScore = newScores.length > 0
        ? newScores.reduce((sum, s) => sum + s.totalScore, 0) / newScores.length
        : null;
      const newSubmittedCount = newScores.filter(s => s.isSubmitted).length;
      const newLockedCount = newScores.filter(s => s.isLocked).length;

      // Get max possible score
      const maxPossible = criteria.length > 0 
        ? criteria.reduce((sum, c) => sum + c.maxScore, 0)
        : 100;

      // Calculate per-criteria averages
      const criteriaAverages = criteria.map((c) => {
        const scoresForCriteria = newScores
          .filter(s => s.isSubmitted)
          .flatMap(s => s.scores)
          .filter(s => s.criteriaId === c.id);
        
        const avg = scoresForCriteria.length > 0
          ? scoresForCriteria.reduce((sum, s) => sum + s.score, 0) / scoresForCriteria.length
          : null;

        return {
          criteriaId: c.id,
          criteriaName: c.name,
          criteriaDescription: c.description,
          maxScore: c.maxScore,
          averageScore: avg,
          scoreCount: scoresForCriteria.length,
        };
      });

      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        name: app.name,
        email: app.email,
        status: app.status,
        submittedAt: app.submittedAt,
        projectTitle: app.researchProposal?.projectTitle || "",
        
        // Legacy scores
        legacyScores: legacyScores.map(s => ({
          reviewerId: s.committeeUserId,
          reviewerName: s.committeeUser.profile?.name || s.committeeUser.email,
          scientificMerit: s.scientificMerit,
          innovation: s.innovation,
          feasibility: s.feasibility,
          budgetJustification: s.budgetJustification,
          viddhakarmaRelevance: s.viddhakarmaRelevance,
          totalScore: s.totalScore,
          isSubmitted: s.isSubmitted,
          isShortlisted: s.isShortlisted,
          remarks: s.remarks,
        })),
        legacyAvgScore,
        legacySubmittedCount,
        
        // New dynamic scores
        scores: newScores.map(s => ({
          id: s.id,
          reviewerId: s.reviewerId,
          reviewerName: s.reviewerName,
          isSubmitted: s.isSubmitted,
          isLocked: s.isLocked,
          lockedAt: s.lockedAt,
          totalScore: s.totalScore,
          maxPossibleScore: s.maxPossibleScore,
          remarks: s.remarks,
          criteria: s.scores.map(c => ({
            criteriaId: c.criteriaId,
            criteriaName: c.criteriaName,
            criteriaDescription: c.criteriaDescription,
            maxScore: c.maxScore,
            score: c.score,
          })),
        })),
        newAvgScore,
        newSubmittedCount,
        newLockedCount,
        
        // Summary
        maxPossibleScore: maxPossible,
        totalReviewers: newScores.length,
        criteriaCount: criteria.length,
        criteriaAverages,
      };
    });

    // Sort by average score (new scoring first, fallback to legacy)
    applicationsWithStats.sort((a, b) => {
      if (a.newAvgScore !== null && b.newAvgScore !== null) {
        return b.newAvgScore - a.newAvgScore;
      }
      if (a.newAvgScore !== null) return -1;
      if (b.newAvgScore !== null) return 1;
      if (a.legacyAvgScore !== null && b.legacyAvgScore !== null) {
        return b.legacyAvgScore - a.legacyAvgScore;
      }
      return 0;
    });

    return NextResponse.json({
      applications: applicationsWithStats,
      criteria,
      summary: {
        totalApplications: applications.length,
        scoredApplications: applicationsWithStats.filter(a => a.newAvgScore !== null).length,
        fullyScoredApplications: applicationsWithStats.filter(a => a.newSubmittedCount === a.totalReviewers && a.totalReviewers > 0).length,
        averageScore: applicationsWithStats.filter(a => a.newAvgScore !== null).length > 0
          ? applicationsWithStats.reduce((sum, a) => sum + (a.newAvgScore || 0), 0) / applicationsWithStats.filter(a => a.newAvgScore !== null).length
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching all scores:", error);
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }
}
