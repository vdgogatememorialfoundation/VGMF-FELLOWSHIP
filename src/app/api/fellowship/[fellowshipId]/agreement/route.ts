import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getFellowshipAgreementFile } from "@/lib/agreement-service";

const STAFF_ROLES = new Set(["ADMIN", "STAFF", "COADMIN", "TRUSTEE", "FINANCE"]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fellowshipId: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fellowshipId } = await params;

  const fellowship = await prisma.fellowship.findUnique({
    where: { id: fellowshipId },
    include: { application: { select: { userId: true } } },
  });

  if (!fellowship) {
    return NextResponse.json({ error: "Fellowship not found" }, { status: 404 });
  }

  const isOwner = fellowship.application.userId === user.id;
  const isStaff = STAFF_ROLES.has(user.role);

  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const file = await getFellowshipAgreementFile(fellowshipId);

  if (!file) {
    return NextResponse.json(
      { error: "Agreement not found. It will be generated when the fellowship is awarded." },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${file.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
