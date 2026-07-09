import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !["ADMIN", "COADMIN", "STAFF"].includes(user.role)) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const formTemplateId = searchParams.get("formTemplateId");
  const formSlug = searchParams.get("slug");

  if (!formTemplateId && !formSlug) {
    return NextResponse.json(
      { error: "formTemplateId or slug is required" },
      { status: 400 }
    );
  }

  try {
    // Find form template by id or slug
    let template;
    if (formTemplateId) {
      template = await prisma.formTemplate.findUnique({
        where: { id: formTemplateId },
      });
    } else {
      template = await prisma.formTemplate.findUnique({
        where: { slug: formSlug as string },
      });
    }

    if (!template) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Get all submissions with user info
    const submissions = await prisma.formSubmission.findMany({
      where: { formTemplateId: template.id },
      include: {
        user: {
          include: {
            profile: true,
            applications: {
              select: {
                id: true,
                applicationNumber: true,
                status: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedSubmissions = submissions.map((submission) => ({
      id: submission.id,
      status: submission.status,
      submittedAt: submission.submittedAt,
      createdAt: submission.createdAt,
      data: submission.data,
      user: {
        id: submission.user.id,
        userId: submission.user.userId,
        name: submission.user.profile?.name || "Unknown",
        email: submission.user.email,
        phone: submission.user.phone,
        application: submission.user.applications[0] || null,
      },
    }));

    return NextResponse.json({
      form: {
        id: template.id,
        name: template.name,
        slug: template.slug,
      },
      submissions: formattedSubmissions,
      total: formattedSubmissions.length,
    });
  } catch (error) {
    console.error("Form submissions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch form submissions" },
      { status: 500 }
    );
  }
}
