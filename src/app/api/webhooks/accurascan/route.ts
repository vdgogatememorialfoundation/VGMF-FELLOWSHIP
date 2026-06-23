import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyAccurascanWebhookSignature } from "@/lib/accurascan";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-accurascan-signature");

    const isValid = await verifyAccurascanWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    if (payload.event === "verification.completed" || payload.event === "verification.failed") {
      const sessionId = payload.sessionId;
      const session = await prisma.verificationSession.findUnique({
        where: { providerRequestId: sessionId },
      });

      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      const status = payload.event === "verification.completed" ? "APPROVED" : "DECLINED";

      await prisma.verificationSession.update({
        where: { id: session.id },
        data: {
          status,
          decisionJson: payload,
          completedAt: new Date(),
        },
      });

      // Update application identity status if applicable
      if (session.purpose === "APPLICANT_IDENTITY" && session.applicationId) {
        await prisma.application.update({
          where: { id: session.applicationId },
          data: {
            identityVerificationStatus: status,
            identityVerifiedAt: status === "APPROVED" ? new Date() : null,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Accurascan Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
