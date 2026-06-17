import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  STAFF_ROLES,
  ROLE_LABELS,
  createUserAccount,
  listUsersByRoles,
  formatAccountForAdmin,
  updateUserByAdmin,
} from "@/lib/admin-users";
import { adminCreateUserSchema, adminUpdateUserSchema } from "@/lib/validations";
import { sendAccountCreatedEmail } from "@/lib/email";

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await listUsersByRoles(STAFF_ROLES);

  return NextResponse.json({
    users: users.map((entry) => formatAccountForAdmin(entry)),
  });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = adminCreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, password, role } = parsed.data;

    const { user: created, loginPath } = await createUserAccount({
      name,
      email,
      phone: phone || undefined,
      password,
      role,
    });

    await sendAccountCreatedEmail(
      created.email,
      created.profile?.name ?? name,
      created.userId,
      ROLE_LABELS[role],
      loginPath
    );

    return NextResponse.json({
      success: true,
      user: {
        id: created.id,
        userId: created.userId,
        name: created.profile?.name,
        email: created.email,
        phone: created.phone,
        role: created.role,
        loginPath,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user";
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

    const { id, isActive, password } = parsed.data;

    if (id === user.id && isActive === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    const updated = await updateUserByAdmin(id, {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(password ? { password } : {}),
    });

    if (!STAFF_ROLES.includes(updated.role)) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: formatAccountForAdmin(updated) });
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
