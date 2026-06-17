import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  createSession,
  setSessionCookie,
  generateUserId,
  getPortalPath,
} from "@/lib/auth";
import { registerSchema, loginSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
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
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        userId,
        email,
        phone: phone || null,
        passwordHash,
        role: "APPLICANT",
        profile: {
          create: { name },
        },
      },
      include: { profile: true },
    });

    await createNotification(
      user.id,
      "Welcome to VGMF Fellowship Portal",
      `Registration successful! Your User ID is ${userId}. You can now complete your fellowship application.`
    );

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.profile?.name,
      },
      redirect: getPortalPath(user.role),
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
