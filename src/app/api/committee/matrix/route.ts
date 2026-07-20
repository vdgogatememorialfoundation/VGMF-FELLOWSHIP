import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/committee/matrix - Get committee matrix for all applications
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !["COMMITTEE", "ADMIN", "COADMIN", "TRUSTEE"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");

    // Get applications with reviews
    const where: any = {};
    if (applicationId) {
      where.id = applicationId;
    }

    const applications = await prisma.application.findMany({
      where,
      select: {
        id: true,
        applicationNumber: true,
        name: true,
        email: true,
        researchProposal: {
          select: {
            projectTitle: true,
            researchArea: true,
          },
        },
        budget: true,
      },
    });

    // Get all reviews for these applications
    const applicationIds = applications.map((a) => a.id);
    const reviews = await prisma.completeReview.findMany({
      where: {
        applicationId: { in: applicationIds },
        isSubmitted: true,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            userId: true,
            email: true,
            profile: {
              select: { name: true },
            },
          },
        },
        responses: {
          include: {
            question: true,
          },
        },
      },
    });

    // Get committee matrices
    const matrices = await prisma.committeeMatrix.findMany({
      where: {
        applicationId: { in: applicationIds },
      },
    });

    // Build response
    const result = applications.map((app) => {
      const appReviews = reviews.filter((r) => r.applicationId === app.id);
      const matrix = matrices.find((m) => m.applicationId === app.id);

      // Calculate section scores for each review
      const reviewsWithScores = appReviews.map((review) => {
        const sectionScores: Record<string, { score: number; maxScore: number; weighted: number }> = {};

        // Group responses by section
        review.responses.forEach((response) => {
          const question = response.question;
          const sectionId = question.sectionId;

          if (!sectionScores[sectionId]) {
            sectionScores[sectionId] = { score: 0, maxScore: 0, weighted: 0 };
          }

          if (question.maxScore) {
            sectionScores[sectionId].score += response.score || 0;
            sectionScores[sectionId].maxScore += question.maxScore;
          }
        });

        // Calculate total and weighted score
        const totalScore = Object.values(sectionScores).reduce(
          (sum, s) => sum + s.score,
          0
        );

        return {
          reviewerId: review.reviewerId,
          reviewerName: review.reviewer.profile?.name || review.reviewer.email,
          sectionScores,
          totalScore,
          recommendation: review.recommendation,
          interviewRecommendation: review.interviewRecommendation,
          budgetRecommended: review.budgetRecommendations?.[0]?.totalRecommended,
          submittedAt: review.submittedAt,
        };
      });

      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        applicantName: app.name,
        projectTitle: app.researchProposal?.projectTitle || "",
        matrix: matrix
          ? {
              id: matrix.id,
              finalDecision: matrix.finalDecision,
              finalScore: matrix.finalScore,
              finalBudget: matrix.finalBudget,
              interviewRequired: matrix.interviewRequired,
              committeeRemarks: matrix.committeeRemarks,
            }
          : null,
        reviews: reviewsWithScores,
      };
    });

    // Filter to only applications with at least one review
    const withReviews = result.filter((app) => app.reviews.length > 0);

    return NextResponse.json(withReviews);
  } catch (error) {
    console.error("Error fetching matrix:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
