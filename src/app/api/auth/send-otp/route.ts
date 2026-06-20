import { NextRequest, NextResponse } from "next/server";
import { sendOtpSchema } from "@/lib/validations";
import { createAndSendOtp } from "@/lib/otp";
import {
  assertSignupEnabled,
  assertSignupOtpChannel,
  assertApplicantLoginEnabled,
  assertLoginOtpChannel,
} from "@/lib/access-control";
import {
  findActiveUserByLoginIdentifier,
  getLoginOtpDeliveryTarget,
} from "@/lib/user-lookup";

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

    const { channel, purpose } = parsed.data;
    let { phone, email } = parsed.data;

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

    if (purpose === "LOGIN") {
      const loginCheck = await assertApplicantLoginEnabled();
      if (!loginCheck.allowed) {
        return NextResponse.json({ error: loginCheck.message }, { status: 403 });
      }

      const otpCheck = await assertLoginOtpChannel(channel);
      if (!otpCheck.allowed) {
        return NextResponse.json({ error: otpCheck.message }, { status: 403 });
      }

      const existingUser = await findActiveUserByLoginIdentifier({ channel, phone, email });

      if (!existingUser) {
        return NextResponse.json(
          { error: "No account found for this email or phone number." },
          { status: 404 }
        );
      }

      const delivery = getLoginOtpDeliveryTarget(existingUser, channel);
      if (delivery.error) {
        return NextResponse.json({ error: delivery.error }, { status: 400 });
      }

      phone = delivery.phone;
      email = delivery.email;
    }

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
