import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/admin/questionnaire/questions/[id] - Get single question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSession();
    if (!user || !["ADMIN", "COADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const question = await prisma.reviewQuestion.findUnique({
      where: { id },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error("Error fetching question:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/questionnaire/questions/[id] - Update question
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSession();
    if (!user || !["ADMIN", "COADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { questionText, questionType, helpText, placeholder, maxScore, weight, required, options, minValue, maxValue, subsection, order, isActive } = body;

    const question = await prisma.reviewQuestion.update({
      where: { id },
      data: {
        ...(questionText !== undefined && { questionText }),
        ...(questionType !== undefined && { questionType }),
        ...(helpText !== undefined && { helpText }),
        ...(placeholder !== undefined && { placeholder }),
        ...(maxScore !== undefined && { maxScore }),
        ...(weight !== undefined && { weight }),
        ...(required !== undefined && { required }),
        ...(options !== undefined && { options }),
        ...(minValue !== undefined && { minValue }),
        ...(maxValue !== undefined && { maxValue }),
        ...(subsection !== undefined && { subsection }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/questionnaire/questions/[id] - Delete question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSession();
    if (!user || !["ADMIN", "COADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.reviewQuestion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
