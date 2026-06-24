import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import { getAllRoleModuleVisibilities, setRoleModuleVisibility } from "@/lib/admin-permissions";

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const perms = await getAllRoleModuleVisibilities();
  return NextResponse.json({ permissions: perms });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { role, module, isVisible } = await request.json();
    
    if (!role || !module || typeof isVisible !== "boolean") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const updated = await setRoleModuleVisibility(role as UserRole, module, isVisible);
    
    return NextResponse.json({ success: true, permission: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
