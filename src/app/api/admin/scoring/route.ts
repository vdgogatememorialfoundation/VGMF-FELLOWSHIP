import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET - Get all scoring criteria
export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const criteria = await prisma.scoringCriteria.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ criteria });
  } catch (error) {
    console.error("Error fetching criteria:", error);
    return NextResponse.json({ error: "Failed to fetch criteria" }, { status: 500 });
  }
}

// POST - Create or update scoring criteria (bulk upsert)
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { criteria } = body;

    if (!Array.isArray(criteria)) {
      return NextResponse.json({ error: "Criteria must be an array" }, { status: 400 });
    }

    // Upsert each criteria
    const results = await Promise.all(
      criteria.map((item: { name: string; description: string; maxScore: number; order: number; isActive?: boolean }, index: number) =>
        prisma.scoringCriteria.upsert({
          where: { name: item.name },
          update: {
            description: item.description,
            maxScore: item.maxScore,
            order: item.order ?? index,
            isActive: item.isActive ?? true,
          },
          create: {
            name: item.name,
            description: item.description,
            maxScore: item.maxScore,
            order: item.order ?? index,
            isActive: item.isActive ?? true,
          },
        })
      )
    );

    return NextResponse.json({ success: true, criteria: results });
  } catch (error) {
    console.error("Error saving criteria:", error);
    return NextResponse.json({ error: "Failed to save criteria" }, { status: 500 });
  }
}

// DELETE - Delete scoring criteria
export async function DELETE(request: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await prisma.scoringCriteria.delete({
      where: { name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting criteria:", error);
    return NextResponse.json({ error: "Failed to delete criteria" }, { status: 500 });
  }
}
