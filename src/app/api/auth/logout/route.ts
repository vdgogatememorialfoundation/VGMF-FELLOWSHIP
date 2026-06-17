import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { getLoginPath, type PortalType } from "@/lib/portal";

const PORTALS: PortalType[] = ["applicant", "admin", "staff", "reviewer", "trustee"];

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  await clearSession();

  const portal = request.nextUrl.searchParams.get("portal");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectPath =
    portal && PORTALS.includes(portal as PortalType)
      ? getLoginPath(portal as PortalType)
      : "/";

  return NextResponse.redirect(new URL(redirectPath, baseUrl));
}
