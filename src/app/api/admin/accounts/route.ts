import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import {
  formatAccountForAdmin,
  listAllAccounts,
  updateUserByAdmin,
} from "@/lib/admin-users";
import { adminUpdateUserSchema } from "@/lib/validations";

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roleParam = request.nextUrl.searchParams.get("role");
  const role =
    roleParam && roleParam !== "ALL"
      ? (roleParam as UserRole)
      : undefined;

  const accounts = await listAllAccounts(role);

  return NextResponse.json({
    accounts: accounts.map(formatAccountForAdmin),
  });
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

    return NextResponse.json({
      success: true,
      account: formatAccountForAdmin(updated),
    });
  } catch {
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
