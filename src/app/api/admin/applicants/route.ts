import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { createUserAccount, listUsersByRoles, formatAccountForAdmin, updateUserByAdmin, deleteUserByAdmin } from "@/lib/admin-users";
import { adminCreateApplicantSchema, adminUpdateUserSchema } from "@/lib/validations";
import { createNotification, sendWelcomeNotifications } from "@/lib/notifications";

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const applicant = await prisma.user.findFirst({
      where: { id, role: "APPLICANT" },
      include: {
        profile: true,
        applications: {
          include: {
            researchProposal: { select: { projectTitle: true } },
            budget: { select: { total: true } },
            fellowship: { select: { fellowshipId: true, currentStage: true, sanctionedAmount: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!applicant) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    return NextResponse.json({ applicant: formatAccountForAdmin(applicant) });
  }

  const applicants = await listUsersByRoles(["APPLICANT"]);

  return NextResponse.json({
    applicants: applicants.map((entry) => formatAccountForAdmin(entry)),
  });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = adminCreateApplicantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone } = parsed.data;
    const generatedPassword = randomBytes(6).toString("hex");

    const { user: created, loginPath } = await createUserAccount({
      name,
      email,
      phone: phone || undefined,
      password: generatedPassword,
      role: "APPLICANT",
    });

    await createNotification(
      created.id,
      "Welcome to VGMF Fellowship Portal",
      `Your applicant account has been created. Your User ID is ${created.userId}. You can now log in and complete your fellowship application.`,
      "EMAIL"
    );

    await sendWelcomeNotifications(
      created.id,
      created.email,
      created.profile?.name ?? name,
      created.userId,
      generatedPassword
    );

    return NextResponse.json({
      success: true,
      applicant: {
        id: created.id,
        userId: created.userId,
        name: created.profile?.name,
        email: created.email,
        phone: created.phone,
        loginPath,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create applicant";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = adminUpdateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { id, isActive, password, name, email, phone } = parsed.data;

    const updated = await updateUserByAdmin(id, {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(password ? { password } : {}),
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
    });

    if (updated.role !== "APPLICANT") {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, applicant: formatAccountForAdmin(updated) });
  } catch {
    return NextResponse.json({ error: "Failed to update applicant" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing applicant id" }, { status: 400 });

    const applicant = await prisma.user.findUnique({
      where: { id, role: "APPLICANT" },
    });

    if (!applicant) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    await deleteUserByAdmin(id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete applicant" }, { status: 500 });
  }
}
