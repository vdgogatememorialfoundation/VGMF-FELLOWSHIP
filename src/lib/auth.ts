import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import prisma from "./db";
import type { UserRole } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const COOKIE_NAME = "vgmf_session";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionUser {
  id: string;
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export { generateUserId, generateApplicationNumber } from "./numeric-id";

export async function generateFellowshipId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.fellowship.count();
  return `FEL-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    await jwtVerify(token, JWT_SECRET);

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: { include: { profile: true } },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    return {
      id: session.user.id,
      userId: session.user.userId,
      email: session.user.email,
      role: session.user.role,
      name: session.user.profile?.name ?? session.user.email,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    cookieStore.delete(COOKIE_NAME);
  }
}

export function getPortalPath(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "STAFF":
    case "FINANCE":
      return "/staff";
    case "COMMITTEE":
      return "/reviewer";
    case "TRUSTEE":
      return "/trustee";
    default:
      return "/applicant";
  }
}
