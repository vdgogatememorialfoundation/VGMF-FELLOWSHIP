import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/reviewer/assignments - Get reviewer's assignments
export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.role !== "COMMITTEE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all assignments for this reviewer
    const assignments = await prisma.enhancedReviewerAssignment.findMany({
      where: { reviewerId: user.id },
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            name: true,
            email: true,
            status: true,
            researchProposal: {
              select: {
                projectTitle: true,
                researchArea: true,
              },
            },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    // Get review stats for each assignment
    const assignmentsWithReviews = await Promise.all(
      assignments.map(async (assignment) => {
        const review = await prisma.completeReview.findFirst({
          where: {
            applicationId: assignment.applicationId,
            reviewerId: user.id,
          },
          orderBy: { createdAt: "desc" },
        });

        return {
          ...assignment,
          review,
        };
      })
    );

    // Calculate stats
    const stats = {
      assigned: assignments.length,
      pending: assignments.filter((a) => a.status === "PENDING" || a.status === "IN_PROGRESS").length,
      completed: assignments.filter((a) => a.status === "SUBMITTED").length,
      overdue: assignments.filter(
        (a) => a.deadline && new Date(a.deadline) < new Date() && a.status !== "SUBMITTED"
      ).length,
      avgReviewTime: 0,
      totalReviews: assignments.filter((a) => a.status === "SUBMITTED").length,
      avgScoreGiven: 0,
    };

    // Calculate average review time and score from completed reviews
    const completedReviews = await prisma.completeReview.findMany({
      where: {
        reviewerId: user.id,
        isSubmitted: true,
      },
    });

    if (completedReviews.length > 0) {
      const totalTime = completedReviews.reduce((sum, r) => sum + (r.timeSpentMinutes || 0), 0);
      stats.avgReviewTime = totalTime / completedReviews.length / 60; // Convert to hours
      stats.avgScoreGiven =
        completedReviews.reduce((sum, r) => sum + r.totalScore, 0) / completedReviews.length;
    }

    return NextResponse.json({
      assignments: assignmentsWithReviews,
      stats,
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
