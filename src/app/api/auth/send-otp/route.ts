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

    const { channel, phone, email, purpose } = parsed.data;
    const result = await createAndSendOtp({ channel, phone, email, purpose });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send OTP" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        channel === "phone"
          ? "OTP sent to your WhatsApp number"
          : "OTP sent to your email address",
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
