import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  createSession,
  setSessionCookie,
  getPortalPath,
} from "@/lib/auth";
import { loginOtpSchema } from "@/lib/validations";
import { PORTAL_ALLOWED_ROLES, PORTAL_LABELS } from "@/lib/portal";
import { phoneLookupVariants } from "@/lib/phone";
import {
  assertApplicantLoginEnabled,
  assertLoginOtpChannel,
  getAccessControl,
} from "@/lib/access-control";
import { verifyOtp } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { channel, phone, email, code, portal } = parsed.data;
    const access = await getAccessControl();

    if (portal === "applicant") {
      const loginCheck = await assertApplicantLoginEnabled();
      if (!loginCheck.allowed) {
        return NextResponse.json({ error: loginCheck.message }, { status: 403 });
      }

      if (!access.loginOtpWhatsappEnabled && !access.loginOtpEmailEnabled) {
        return NextResponse.json(
          { error: "OTP login is not enabled for applicants." },
          { status: 403 }
        );
      }
    } else if (portal) {
      return NextResponse.json(
        { error: "OTP login is only available for the applicant portal." },
        { status: 403 }
      );
    }

    const otpCheck = await assertLoginOtpChannel(channel);
    if (!otpCheck.allowed) {
      return NextResponse.json({ error: otpCheck.message }, { status: 403 });
    }

    const otpResult = await verifyOtp({
      channel,
      phone,
      email,
      code,
      purpose: "LOGIN",
    });

    if (!otpResult.valid) {
      return NextResponse.json({ error: otpResult.error }, { status: 400 });
    }

    const normalizedEmail = email?.trim().toLowerCase();
    const phoneVariants = phone ? phoneLookupVariants(phone) : [];

    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          ...phoneVariants.map((variant) => ({ phone: variant })),
        ],
      },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found for this email or phone number." },
        { status: 404 }
      );
    }

    if (portal) {
      const allowedRoles = PORTAL_ALLOWED_ROLES[portal];
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          {
            error: `This account is not authorized for the ${PORTAL_LABELS[portal]}. Please use the correct portal.`,
          },
          { status: 403 }
        );
      }
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.profile?.name,
        role: user.role,
      },
      redirect: getPortalPath(user.role),
    });
  } catch (error) {
    console.error("OTP login error:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
