import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET - Get active scoring criteria for reviewers
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is reviewer, committee, trustee, or admin
    const allowedRoles = ["COMMITTEE", "REVIEWER", "TRUSTEE", "ADMIN", "STAFF"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const criteria = await prisma.scoringCriteria.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    // If no criteria in database, return defaults
    if (criteria.length === 0) {
      return NextResponse.json({
        criteria: [
          { name: "scientificMerit", description: "Scientific Merit", maxScore: 25, order: 1 },
          { name: "innovation", description: "Innovation", maxScore: 20, order: 2 },
          { name: "feasibility", description: "Feasibility", maxScore: 20, order: 3 },
          { name: "budgetJustification", description: "Budget Justification", maxScore: 20, order: 4 },
          { name: "viddhakarmaRelevance", description: "Viddhakarma Relevance", maxScore: 15, order: 5 },
        ],
      });
    }

    return NextResponse.json({ criteria });
  } catch (error) {
    console.error("Error fetching criteria:", error);
    return NextResponse.json({ error: "Failed to fetch criteria" }, { status: 500 });
  }
}
