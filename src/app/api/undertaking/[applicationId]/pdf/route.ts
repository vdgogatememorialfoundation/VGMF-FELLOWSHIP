import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getUndertakingPdfFile } from "@/lib/undertaking-assets";

const STAFF_ROLES = new Set(["ADMIN", "STAFF", "TRUSTEE", "COMMITTEE"]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await params;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { userId: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const isOwner = application.userId === user.id;
  const isStaff = STAFF_ROLES.has(user.role);

  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const file = await getUndertakingPdfFile(applicationId);

  if (!file) {
    return NextResponse.json(
      { error: "Undertaking PDF not found. Please sign the digital undertaking again." },
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
