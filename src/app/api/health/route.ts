import { NextResponse } from "next/server";
import { getR2ConfigStatus } from "@/lib/r2-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Lightweight endpoint for UptimeRobot, Cron-job.org, and Render keep-alive pings. */
export async function GET() {
  const r2 = getR2ConfigStatus();

  return NextResponse.json(
    {
      ok: true,
      service: "vgmf-fellowship-portal",
      keepalive: true,
      storage: {
        r2Configured: r2.configured,
        r2Bucket: r2.bucket,
        r2HasCredentials: r2.hasAccessKey && r2.hasSecretKey,
      },
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
