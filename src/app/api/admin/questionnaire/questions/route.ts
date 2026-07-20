import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/admin/questionnaire/questions - Get all questions
export async function GET() {
  try {
    const user = await getSession();
    if (!user || !["ADMIN", "COADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const questions = await prisma.reviewQuestion.findMany({
      orderBy: [{ sectionId: "asc" }, { order: "asc" }],
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/questionnaire/questions - Create new question
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !["ADMIN", "COADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sectionId, questionText, questionType, helpText, placeholder, maxScore, weight, required, options, minValue, maxValue, subsection, order, isActive } = body;

    // Get the next order number for this section
    const lastQuestion = await prisma.reviewQuestion.findFirst({
      where: { sectionId },
      orderBy: { order: "desc" },
    });
    const nextOrder = lastQuestion ? lastQuestion.order + 1 : 0;

    const question = await prisma.reviewQuestion.create({
      data: {
        sectionId,
        questionText,
        questionType,
        helpText,
        placeholder,
        maxScore,
        weight: weight ?? 1,
        required: required ?? true,
        options,
        minValue,
        maxValue,
        subsection,
        order: order ?? nextOrder,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
