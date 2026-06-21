import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  hashPassword,
  createSession,
  setSessionCookie,
  generateUserId,
  getPortalPath,
  generateInternalPassword,
} from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { createNotification, sendWelcomeNotifications } from "@/lib/notifications";
import { isEmailOtpVerified, isPhoneOtpVerified } from "@/lib/otp";
import {
  assertSignupEnabled,
  getAccessControl,
  isSignupOtpRequired,
} from "@/lib/access-control";
import { normalizePhoneDigits, phoneLookupVariants } from "@/lib/phone";

export async function POST(request: NextRequest) {
  try {
    const signupCheck = await assertSignupEnabled();
    if (!signupCheck.allowed) {
      return NextResponse.json({ error: signupCheck.message }, { status: 403 });
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, password, confirmPassword } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone ? normalizePhoneDigits(phone) : null;
    const access = await getAccessControl();

    if (access.signupOtpWhatsappEnabled && normalizedPhone) {
      const phoneOtpVerified = await isPhoneOtpVerified(normalizedPhone, "REGISTER");
      if (!phoneOtpVerified) {
        return NextResponse.json(
          { error: "Please verify your mobile number with WhatsApp OTP first" },
          { status: 400 }
        );
      }
    }

    if (access.signupOtpEmailEnabled) {
      const emailOtpVerified = await isEmailOtpVerified(normalizedEmail, "REGISTER");
      if (!emailOtpVerified) {
        return NextResponse.json(
          { error: "Please verify your email address with email OTP first" },
          { status: 400 }
        );
      }
    }

    if (access.signupPasswordEnabled) {
      if (!password || password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }
      if (password !== confirmPassword) {
        return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
      }
    } else if (password || confirmPassword) {
      return NextResponse.json(
        { error: "Password registration is currently disabled" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          ...(normalizedPhone
            ? phoneLookupVariants(normalizedPhone).map((variant) => ({ phone: variant }))
            : []),
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email or phone already registered" },
        { status: 409 }
      );
    }

    const userId = await generateUserId();
    const resolvedPassword =
      access.signupPasswordEnabled && password ? password : generateInternalPassword();
    const passwordHash = await hashPassword(resolvedPassword);

    const user = await prisma.user.create({
      data: {
        userId,
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        adminPassword: access.signupPasswordEnabled ? resolvedPassword : null,
        role: "APPLICANT",
        profile: {
          create: { name },
        },
      },
      include: { profile: true },
    });

    const token = await createSession(user.id);
    await setSessionCookie(token);

    void (async () => {
      try {
        await createNotification(
          user.id,
          "Welcome to VGMF Fellowship Portal",
          `Registration successful! Your User ID is ${userId}. You can now complete your fellowship application.`,
          "EMAIL"
        );
        await sendWelcomeNotifications(user.id, normalizedEmail, name, userId);
      } catch (notificationError) {
        console.error("Registration notifications failed:", notificationError);
      }
    })();

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.profile?.name,
      },
      redirect: getPortalPath(user.role),
      otpRequired: isSignupOtpRequired(access),
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
