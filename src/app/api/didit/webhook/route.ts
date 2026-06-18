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
  const timestamp = request.headers.get("x-timestamp");
  if (!verifyDiditWebhookSignature(rawBody, signature, config.webhookSecret, timestamp)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: DiditWebhookPayload & Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as DiditWebhookPayload & Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId =
    (typeof payload.session_id === "string" && payload.session_id) ||
    (payload.decision &&
      typeof payload.decision === "object" &&
      typeof (payload.decision as Record<string, unknown>).session_id === "string" &&
      String((payload.decision as Record<string, unknown>).session_id)) ||
    "";

  const status =
    (typeof payload.status === "string" && payload.status) ||
    (payload.decision &&
      typeof payload.decision === "object" &&
      typeof (payload.decision as Record<string, unknown>).status === "string" &&
      String((payload.decision as Record<string, unknown>).status)) ||
    "";

  if (!sessionId || !status) {
    return NextResponse.json({ error: "Missing session_id or status" }, { status: 400 });
  }

  try {
    const result = await applyDiditWebhook({
      session_id: sessionId,
      status,
      vendor_data: typeof payload.vendor_data === "string" ? payload.vendor_data : undefined,
      decision:
        (payload.decision as Record<string, unknown> | undefined) ??
        (typeof payload.decision === "undefined" ? undefined : (payload as Record<string, unknown>)),
    });
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
