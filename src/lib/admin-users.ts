import prisma from "./db";
import type { UserRole } from "@prisma/client";
import { hashPassword } from "./auth";
import { generateUserId } from "./numeric-id";
import { normalizePhoneDigits } from "./phone";
import { roleToPortal, getLoginPath } from "./portal";

export const STAFF_ROLES: UserRole[] = ["ADMIN", "STAFF", "FINANCE", "COMMITTEE", "TRUSTEE"];

export const ALL_PORTAL_ROLES: UserRole[] = [...STAFF_ROLES, "APPLICANT"];

export const ROLE_LABELS: Record<UserRole, string> = {
  APPLICANT: "Applicant",
  ADMIN: "Admin",
  STAFF: "Staff",
  FINANCE: "Finance",
  COMMITTEE: "Reviewer",
  TRUSTEE: "Trustee",
};

interface CreateAccountInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
}

export async function createUserAccount(input: CreateAccountInput) {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() ? normalizePhoneDigits(input.phone) : null;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, ...(phone ? [{ phone }] : [])],
    },
  });

  if (existing) {
    throw new Error("Email or phone already registered");
  }

  const userId = await generateUserId();
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      userId,
      email,
      phone,
      passwordHash,
      adminPassword: input.password,
      role: input.role,
      profile: {
        create: { name: input.name.trim() },
      },
    },
    include: { profile: true },
  });

  return {
    user,
    loginPath: getLoginPath(roleToPortal(input.role)),
  };
}

export async function listUsersByRoles(roles: UserRole[]) {
  return prisma.user.findMany({
    where: { role: { in: roles } },
    include: {
      profile: true,
      applications: { select: { id: true, applicationNumber: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAllAccounts(role?: UserRole) {
  return prisma.user.findMany({
    where: role ? { role } : undefined,
    include: {
      profile: true,
      applications: {
        select: { id: true, applicationNumber: true, status: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });
}

export async function updateUserByAdmin(
  id: string,
  data: {
    isActive?: boolean;
    password?: string;
    name?: string;
    email?: string;
    phone?: string;
  }
) {
  const update: {
    isActive?: boolean;
    passwordHash?: string;
    adminPassword?: string;
    email?: string;
    phone?: string | null;
  } = {};

  if (data.isActive !== undefined) {
    update.isActive = data.isActive;
  }

  if (data.password) {
    update.passwordHash = await hashPassword(data.password);
    update.adminPassword = data.password;
  }

  if (data.email) {
    update.email = data.email.trim().toLowerCase();
  }

  if (data.phone !== undefined) {
    update.phone = data.phone.trim() ? normalizePhoneDigits(data.phone) : null;
  }

  if (data.name) {
    await prisma.profile.upsert({
      where: { userId: id },
      update: { name: data.name.trim() },
      create: { userId: id, name: data.name.trim() },
    });
  }

  if (Object.keys(update).length > 0) {
    return prisma.user.update({
      where: { id },
      data: update,
      include: {
        profile: true,
        applications: {
          select: { id: true, applicationNumber: true, status: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      applications: {
        select: { id: true, applicationNumber: true, status: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) throw new Error("User not found");
  return user;
}

export function formatAccountForAdmin(
  entry: Awaited<ReturnType<typeof listAllAccounts>>[number]
) {
  return {
    id: entry.id,
    userId: entry.userId,
    name: entry.profile?.name ?? "—",
    email: entry.email,
    phone: entry.phone,
    role: entry.role,
    roleLabel: ROLE_LABELS[entry.role],
    adminPassword: entry.adminPassword,
    isActive: entry.isActive,
    createdAt: entry.createdAt,
    loginPath: getLoginPath(roleToPortal(entry.role)),
    applications: entry.applications,
  };
}
