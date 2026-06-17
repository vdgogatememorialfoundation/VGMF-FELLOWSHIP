import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { processFellowshipReminders } from "@/lib/fellowship-alerts";

export async function POST() {
  const user = await getSession();
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processFellowshipReminders();
  return NextResponse.json({ success: true, ...result });
}
