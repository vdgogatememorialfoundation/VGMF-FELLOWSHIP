import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  buildAdminReportCsv,
  buildAdminReportPdf,
  isAdminReportId,
  reportDownloadFilename,
} from "@/lib/admin-reports";

export const maxDuration = 60;

const ALLOWED_ROLES = new Set(["ADMIN", "STAFF"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ report: string }> }
) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { report } = await params;
  if (!isAdminReportId(report)) {
    return NextResponse.json({ error: "Unknown report type" }, { status: 404 });
  }

  const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "csv";

  try {
    if (format === "pdf") {
      const pdf = await buildAdminReportPdf(report);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${reportDownloadFilename(report, "pdf")}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const csv = await buildAdminReportCsv(report);
    return new NextResponse(new Uint8Array(csv), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${reportDownloadFilename(report, "csv")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Admin report export error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
