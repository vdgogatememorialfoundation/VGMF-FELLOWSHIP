import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { getLoginPath, type PortalType } from "@/lib/portal";
import { buildPublicUrl } from "@/lib/request-origin";

const PORTALS: PortalType[] = ["applicant", "admin", "staff", "reviewer", "trustee"];

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  await clearSession();

  const portal = request.nextUrl.searchParams.get("portal");
  const redirectPath =
    portal && PORTALS.includes(portal as PortalType)
      ? getLoginPath(portal as PortalType)
      : "/";

  return NextResponse.redirect(buildPublicUrl(request, redirectPath));
}
