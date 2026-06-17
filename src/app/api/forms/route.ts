import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { getActiveFormTemplate } from "@/lib/cms";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") || "fellowship-application";

  const template = await getActiveFormTemplate(slug);
  if (!template) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { formTemplateId, data, status, submissionId } = body;

    if (submissionId) {
      const submission = await prisma.formSubmission.update({
        where: { id: submissionId, userId: user.id },
        data: {
          data,
          status: status || "DRAFT",
          submittedAt: status === "SUBMITTED" ? new Date() : undefined,
        },
      });
      return NextResponse.json({ submission });
    }

    const submission = await prisma.formSubmission.create({
      data: {
        formTemplateId,
        userId: user.id,
        data,
        status: status || "DRAFT",
        submittedAt: status === "SUBMITTED" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Form submission error:", error);
    return NextResponse.json({ error: "Failed to save form" }, { status: 500 });
  }
}
