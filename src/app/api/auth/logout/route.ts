import { NextRequest, NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { getLoginPath, type PortalType } from "@/lib/portal";
import { buildPublicUrl } from "@/lib/request-origin";

const PORTALS: PortalType[] = ["applicant", "admin", "staff", "reviewer", "trustee"];

export async function POST() {
  const session = await getSession();
  if (session) {
    await logActivity(session.id, "LOGOUT");
  }
  await clearSession();
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (session) {
    await logActivity(session.id, "LOGOUT");
  }
  await clearSession();

  const portal = request.nextUrl.searchParams.get("portal");
  const redirectPath =
    portal && PORTALS.includes(portal as PortalType)
      ? getLoginPath(portal as PortalType)
      : "/";

  return NextResponse.redirect(buildPublicUrl(request, redirectPath));
}
