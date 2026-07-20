import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/admin/questionnaire/sections - Get all sections with questions
export async function GET() {
  try {
    const user = await getSession();
    if (!user || !["ADMIN", "COADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sections = await prisma.reviewSection.findMany({
      orderBy: { order: "asc" },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(sections);
  } catch (error) {
    console.error("Error fetching sections:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/questionnaire/sections - Create new section
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !["ADMIN", "COADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, description, helpText, order, weight, maxScore, isRequired, isActive } = body;

    const section = await prisma.reviewSection.create({
      data: {
        name,
        type,
        description,
        helpText,
        order: order ?? 0,
        weight: weight ?? 10,
        maxScore: maxScore ?? 100,
        isRequired: isRequired ?? true,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(section);
  } catch (error) {
    console.error("Error creating section:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
