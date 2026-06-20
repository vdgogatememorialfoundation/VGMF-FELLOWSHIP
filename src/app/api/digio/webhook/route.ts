import { NextRequest, NextResponse } from "next/server";
import { getDigioConfig, verifyDigioWebhookSecret, verifyDigioWebhookSignature } from "@/lib/digio";
import { applyDigioWebhook } from "@/lib/digio-workflow";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const config = await getDigioConfig();

  if (!config.webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  const providedSecret = request.headers.get("x-digio-webhook-secret");
  const signature = request.headers.get("x-digio-signature");

  const secretValid = verifyDigioWebhookSecret(providedSecret, config.webhookSecret);
  const signatureValid = verifyDigioWebhookSignature(rawBody, signature, config.webhookSecret);

  if (!secretValid && !signatureValid) {
    return NextResponse.json({ error: "Invalid webhook authentication" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await applyDigioWebhook(payload);
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
    console.error("Digio webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
