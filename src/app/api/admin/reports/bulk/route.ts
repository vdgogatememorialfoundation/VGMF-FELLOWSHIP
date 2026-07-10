import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildAllReportsZip, buildReportForEmail, ADMIN_REPORTS, type AdminReportId } from "@/lib/admin-reports";
import { isAdminReportId, reportZipFilename } from "@/lib/admin-report-types";
import prisma from "@/lib/db";

const ALLOWED_ROLES = new Set(["ADMIN", "STAFF", "COADMIN"]);

// GET - Download all reports as ZIP
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const zipBuffer = await buildAllReportsZip();
    
    // Log the download
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "BULK_REPORT_DOWNLOADED",
        details: {
          format: "zip",
          reportCount: ADMIN_REPORTS.length,
          downloadedAt: new Date().toISOString(),
        },
      },
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${reportZipFilename()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Bulk report download error:", error);
    return NextResponse.json({ error: "Failed to generate bulk reports" }, { status: 500 });
  }
}
