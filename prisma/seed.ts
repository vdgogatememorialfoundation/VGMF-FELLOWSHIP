import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateUserId } from "../src/lib/numeric-id";

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

const SEED_ACCOUNTS = [
  {
    email: "admin@vaidyagogate.org",
    password: "Admin@2026",
    role: "ADMIN" as const,
    name: "VGMF Admin",
  },
  {
    email: "committee@vgmf.org",
    password: "Committee@123",
    role: "COMMITTEE" as const,
    name: "Dr. Research Committee",
  },
  {
    email: "staff@vgmf.org",
    password: "Staff@123",
    role: "STAFF" as const,
    name: "Foundation Staff",
  },
  {
    email: "trustee@vgmf.org",
    password: "Trustee@123",
    role: "TRUSTEE" as const,
    name: "Board Trustee",
  },
];

async function main() {
  for (const account of SEED_ACCOUNTS) {
    const passwordHash = await hashPassword(account.password);
    const existing = await prisma.user.findUnique({ where: { email: account.email } });
    const userId = existing?.userId ?? (await generateUserId());

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        passwordHash,
        adminPassword: account.password,
        role: account.role,
        isActive: true,
      },
      create: {
        userId,
        email: account.email,
        passwordHash,
        adminPassword: account.password,
        role: account.role,
        profile: { create: { name: account.name } },
      },
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: { name: account.name },
      create: { userId: user.id, name: account.name },
    });
  }

  console.log("Seed completed:");
  for (const account of SEED_ACCOUNTS) {
    console.log(`  ${account.role}: ${account.email} / ${account.password}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
