import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { createUserAccount, listUsersByRoles } from "@/lib/admin-users";
import { adminCreateApplicantSchema, adminUpdateUserSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applicants = await listUsersByRoles(["APPLICANT"]);

  return NextResponse.json({
    applicants: applicants.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      name: entry.profile?.name ?? "—",
      email: entry.email,
      phone: entry.phone,
      isActive: entry.isActive,
      createdAt: entry.createdAt,
      applications: entry.applications,
    })),
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

    const { name, email, phone, password } = parsed.data;

    const { user: created, loginPath } = await createUserAccount({
      name,
      email,
      phone: phone || undefined,
      password,
      role: "APPLICANT",
    });

    await createNotification(
      created.id,
      "Welcome to VGMF Fellowship Portal",
      `Your applicant account has been created. Your User ID is ${created.userId}. You can now log in and complete your fellowship application.`,
      "EMAIL"
    );

    await sendWelcomeEmail(created.email, created.profile?.name ?? name, created.userId);

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

    const { id, isActive } = parsed.data;

    const updated = await prisma.user.update({
      where: { id, role: "APPLICANT" },
      data: { ...(isActive !== undefined ? { isActive } : {}) },
      include: { profile: true, applications: true },
    });

    return NextResponse.json({ success: true, applicant: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update applicant" }, { status: 500 });
  }
}
