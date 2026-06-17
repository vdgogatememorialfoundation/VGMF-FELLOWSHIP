import { NextRequest, NextResponse } from "next/server";
import { sendOtpSchema } from "@/lib/validations";
import { createAndSendOtp } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { phone, purpose } = parsed.data;
    const result = await createAndSendOtp(phone, purpose);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send OTP" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent to your WhatsApp number",
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
