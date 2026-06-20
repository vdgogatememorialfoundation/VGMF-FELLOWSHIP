import prisma from "./db";
import { normalizePhoneDigits, phoneLookupVariants } from "./phone";
import type { OtpChannel } from "./otp";

const USER_ID_PATTERN = /^VGMF-\d{4}-\d+$/i;

type UserWithProfile = Awaited<
  ReturnType<typeof prisma.user.findFirst<{ include: { profile: true } }>>
>;

async function findByEmail(email: string): Promise<UserWithProfile> {
  return prisma.user.findFirst({
    where: { isActive: true, email },
    include: { profile: true },
  });
}

async function findByUserId(userId: string): Promise<UserWithProfile> {
  return prisma.user.findFirst({
    where: { isActive: true, userId: userId.toUpperCase() },
    include: { profile: true },
  });
}

async function findByPhone(rawPhone: string): Promise<UserWithProfile> {
  const normalized = normalizePhoneDigits(rawPhone);
  if (!normalized) return null;

  const variants = phoneLookupVariants(rawPhone);
  const direct = await prisma.user.findFirst({
    where: {
      isActive: true,
      OR: variants.map((variant) => ({ phone: variant })),
    },
    include: { profile: true },
  });
  if (direct) return direct;

  const candidates = await prisma.user.findMany({
    where: { isActive: true, phone: { not: null } },
    include: { profile: true },
  });

  return (
    candidates.find(
      (user) => user.phone && normalizePhoneDigits(user.phone) === normalized
    ) ?? null
  );
}

/** Resolve applicant/staff login input (phone, email, or VGMF user ID). */
export async function findActiveUserByLoginIdentifier(params: {
  channel: OtpChannel;
  phone?: string;
  email?: string;
}): Promise<UserWithProfile> {
  if (params.channel === "email") {
    const email = params.email?.trim().toLowerCase();
    if (!email) return null;
    return findByEmail(email);
  }

  const raw = params.phone?.trim() || "";
  if (!raw) return null;

  if (USER_ID_PATTERN.test(raw)) {
    const byUserId = await findByUserId(raw);
    if (byUserId) return byUserId;
  }

  if (raw.includes("@")) {
    const byEmail = await findByEmail(raw.toLowerCase());
    if (byEmail) return byEmail;
  }

  return findByPhone(raw);
}

export function getLoginOtpDeliveryTarget(
  user: NonNullable<UserWithProfile>,
  channel: OtpChannel
): { phone?: string; email?: string; error?: string } {
  if (channel === "email") {
    return { email: user.email.trim().toLowerCase() };
  }

  const phone = user.phone ? normalizePhoneDigits(user.phone) : "";
  if (!phone) {
    return {
      error:
        "This account has no mobile number on file. Sign in with email OTP or contact the foundation.",
    };
  }

  return { phone };
}
