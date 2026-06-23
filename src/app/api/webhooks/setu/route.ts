import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    if (payload.event === "EKYC_DATA" && payload.data) {
      const { id, status, aadhaar } = payload.data;

      const session = await prisma.verificationSession.findUnique({
        where: { providerRequestId: id }
      });

      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      if (status === "SUCCESS") {
         await prisma.verificationSession.update({
           where: { id: session.id },
           data: {
             status: "APPROVED",
             decisionJson: aadhaar,
             completedAt: new Date(),
           }
         });
      } else if (status === "ERROR" || status === "FAILED") {
         await prisma.verificationSession.update({
           where: { id: session.id },
           data: {
             status: "DECLINED",
             decisionJson: payload.data,
             completedAt: new Date(),
           }
         });
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ ignored: true });
  } catch (error) {
    console.error("Setu Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
