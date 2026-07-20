import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { REVIEW_QUESTIONNAIRE, SECTION_WEIGHTS, calculateWeightedScore } from "@/lib/review-questionnaire";

// GET /api/reviewer/reviews - Get all reviews by reviewer
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user || user.role !== "COMMITTEE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");

    const where: any = { reviewerId: user.id };
    if (applicationId) {
      where.applicationId = applicationId;
    }

    const reviews = await prisma.completeReview.findMany({
      where,
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            name: true,
          },
        },
        responses: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/reviewer/reviews - Save or submit a review
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user || user.role !== "COMMITTEE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId, responses, isDraft, conflictDeclared } = body;

    // Get or create conflict of interest record
    if (conflictDeclared !== undefined) {
      await prisma.conflictOfInterest.upsert({
        where: {
          applicationId_reviewerId: {
            applicationId,
            reviewerId: user.id,
          },
        },
        create: {
          applicationId,
          reviewerId: user.id,
          status: conflictDeclared ? "DECLARED" : "NO_CONFLICT",
          declaresNoConflict: !conflictDeclared,
          declarationTimestamp: new Date(),
        },
        update: {
          status: conflictDeclared ? "DECLARED" : "NO_CONFLICT",
          declaresNoConflict: !conflictDeclared,
          declarationTimestamp: new Date(),
        },
      });
    }

    // Calculate total score
    const calc = calculateWeightedScore(responses);
    const totalScore = calc.totalScore;
    const maxPossibleScore = calc.maxScore;

    // Get section ID from the first response
    const firstQuestionId = Object.keys(responses)[0];
    let sectionId = "";

    if (firstQuestionId) {
      const question = await prisma.reviewQuestion.findUnique({
        where: { id: firstQuestionId },
      });
      if (question) {
        sectionId = question.sectionId;
      }
    }

    // Find existing review or create new
    const existingReview = await prisma.completeReview.findFirst({
      where: {
        applicationId,
        reviewerId: user.id,
        sectionId,
      },
    });

    if (existingReview) {
      // Update existing review
      const review = await prisma.completeReview.update({
        where: { id: existingReview.id },
        data: {
          totalScore,
          maxPossibleScore,
          isDraft,
          isSubmitted: !isDraft,
          submittedAt: isDraft ? null : new Date(),
        },
      });

      // Update responses
      for (const [questionId, response] of Object.entries(responses)) {
        await prisma.reviewResponse.upsert({
          where: {
            questionId_reviewId: {
              questionId,
              reviewId: existingReview.id,
            },
          },
          create: {
            questionId,
            reviewId: existingReview.id,
            score: (response as any).score,
            booleanValue: (response as any).booleanValue,
            textValue: (response as any).textValue,
            selectedOptions: (response as any).selectedOptions
              ? JSON.stringify((response as any).selectedOptions)
              : null,
            confidenceLevel: (response as any).confidenceLevel,
            tableData: (response as any).tableData,
          },
          update: {
            score: (response as any).score,
            booleanValue: (response as any).booleanValue,
            textValue: (response as any).textValue,
            selectedOptions: (response as any).selectedOptions
              ? JSON.stringify((response as any).selectedOptions)
              : null,
            confidenceLevel: (response as any).confidenceLevel,
            tableData: (response as any).tableData,
          },
        });
      }

      return NextResponse.json(review);
    } else {
      // Create new review
      const review = await prisma.completeReview.create({
        data: {
          applicationId,
          reviewerId: user.id,
          sectionId,
          totalScore,
          maxPossibleScore,
          isDraft,
          isSubmitted: !isDraft,
          submittedAt: isDraft ? null : new Date(),
        },
      });

      // Create responses
      for (const [questionId, response] of Object.entries(responses)) {
        await prisma.reviewResponse.create({
          data: {
            questionId,
            reviewId: review.id,
            score: (response as any).score,
            booleanValue: (response as any).booleanValue,
            textValue: (response as any).textValue,
            selectedOptions: (response as any).selectedOptions
              ? JSON.stringify((response as any).selectedOptions)
              : null,
            confidenceLevel: (response as any).confidenceLevel,
            tableData: (response as any).tableData,
          },
        });
      }

      // Update assignment status
      await prisma.enhancedReviewerAssignment.updateMany({
        where: {
          applicationId,
          reviewerId: user.id,
        },
        data: {
          status: isDraft ? "IN_PROGRESS" : "SUBMITTED",
          startedAt: new Date(),
          completedAt: isDraft ? null : new Date(),
        },
      });

      return NextResponse.json(review);
    }
  } catch (error) {
    console.error("Error saving review:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
