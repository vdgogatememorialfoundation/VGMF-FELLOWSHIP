import { NextRequest, NextResponse } from "next/server";
import {
  getDiditConfig,
  verifyDiditWebhookSignature,
  type DiditWebhookPayload,
} from "@/lib/didit";
import { applyDiditWebhook } from "@/lib/didit-workflow";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const config = await getDiditConfig();

  if (!config.webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-signature-v2");
  if (!verifyDiditWebhookSignature(rawBody, signature, config.webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: DiditWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as DiditWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.session_id || !payload.status) {
    return NextResponse.json({ error: "Missing session_id or status" }, { status: 400 });
  }

  try {
    const result = await applyDiditWebhook(payload);
    if (!result.ok) {
      return NextResponse.json({ received: true, matched: false }, { status: 202 });
    }

    return NextResponse.json({
      received: true,
      matched: true,
      purpose: result.purpose,
      status: result.status,
    });
  } catch (error) {
    console.error("Didit webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
