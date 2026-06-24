import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
  createSession,
  setSessionCookie,
  getPortalPath,
} from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { loginSchema } from "@/lib/validations";
import { PORTAL_ALLOWED_ROLES, PORTAL_LABELS } from "@/lib/portal";
import { assertApplicantLoginEnabled, getAccessControl } from "@/lib/access-control";
import { findActiveUserByLoginIdentifier } from "@/lib/user-lookup";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { identifier, password, portal } = parsed.data;
    const access = await getAccessControl();

    if (portal === "applicant") {
      const loginCheck = await assertApplicantLoginEnabled();
      if (!loginCheck.allowed) {
        return NextResponse.json({ error: loginCheck.message }, { status: 403 });
      }

      if (!access.loginPasswordEnabled) {
        return NextResponse.json(
          {
            error:
              "Password login is disabled for applicants. Sign in with WhatsApp OTP instead.",
          },
          { status: 403 }
        );
      }
    }

    const trimmedIdentifier = identifier.trim();
    const isEmail = trimmedIdentifier.includes("@");

    const user = await findActiveUserByLoginIdentifier({
      channel: isEmail ? "email" : "phone",
      phone: isEmail ? undefined : trimmedIdentifier,
      email: isEmail ? trimmedIdentifier : undefined,
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email/phone or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email/phone or password" },
        { status: 401 }
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
    await logActivity(user.id, "LOGIN", { method: "password" });
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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
