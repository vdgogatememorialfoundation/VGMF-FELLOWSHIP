import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  const settings = await prisma.integrationSettings.findUnique({
    where: { id: "default" },
    select: { whatsappWebhookVerifyToken: true },
  });

  const expected =
    settings?.whatsappWebhookVerifyToken?.trim() ||
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() ||
    "";

  if (mode === "subscribe" && token && challenge && token === expected) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null);
    console.info("WhatsApp webhook event:", JSON.stringify(payload)?.slice(0, 2000));
  } catch (error) {
    console.error("WhatsApp webhook parse error:", error);
  }

  return NextResponse.json({ success: true });
}
