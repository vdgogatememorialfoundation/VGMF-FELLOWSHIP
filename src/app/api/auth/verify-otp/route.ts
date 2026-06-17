import { NextRequest, NextResponse } from "next/server";
import { verifyOtpSchema } from "@/lib/validations";
import { verifyOtp } from "@/lib/otp";
import { assertSignupEnabled, assertSignupOtpChannel } from "@/lib/access-control";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { channel, phone, email, code, purpose } = parsed.data;

    if (purpose === "REGISTER") {
      const signupCheck = await assertSignupEnabled();
      if (!signupCheck.allowed) {
        return NextResponse.json({ error: signupCheck.message }, { status: 403 });
      }

      const otpCheck = await assertSignupOtpChannel(channel);
      if (!otpCheck.allowed) {
        return NextResponse.json({ error: otpCheck.message }, { status: 403 });
      }
    }

    const result = await verifyOtp({ channel, phone, email, code, purpose });

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "OTP verified" });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
