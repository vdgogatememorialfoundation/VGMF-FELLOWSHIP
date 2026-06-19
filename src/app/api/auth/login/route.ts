import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  verifyPassword,
  createSession,
  setSessionCookie,
  getPortalPath,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { PORTAL_ALLOWED_ROLES, PORTAL_LABELS } from "@/lib/portal";
import { phoneLookupVariants } from "@/lib/phone";
import { assertApplicantLoginEnabled } from "@/lib/access-control";

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

    if (portal === "applicant") {
      const loginCheck = await assertApplicantLoginEnabled();
      if (!loginCheck.allowed) {
        return NextResponse.json({ error: loginCheck.message }, { status: 403 });
      }
    }

    const trimmedIdentifier = identifier.trim();
    const phoneVariants = phoneLookupVariants(trimmedIdentifier);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedIdentifier.toLowerCase() },
          ...phoneVariants.map((phone) => ({ phone })),
        ],
        isActive: true,
      },
      include: { profile: true },
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
