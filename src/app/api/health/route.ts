import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Lightweight endpoint for UptimeRobot, Cron-job.org, and Render keep-alive pings. */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "vgmf-fellowship-portal",
      keepalive: true,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
