import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

async function generateUserId() {
  const year = new Date().getFullYear();
  const count = await prisma.user.count();
  return `VGMF-${year}-${String(count + 1).padStart(5, "0")}`;
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@vaidyagogate.org" },
    update: {
      passwordHash: await hashPassword("Admin@2026"),
      role: "ADMIN",
      isActive: true,
    },
    create: {
      userId: await generateUserId(),
      email: "admin@vaidyagogate.org",
      passwordHash: await hashPassword("Admin@2026"),
      role: "ADMIN",
      profile: { create: { name: "VGMF Admin" } },
    },
  });

  await prisma.profile.upsert({
    where: { userId: admin.id },
    update: { name: "VGMF Admin" },
    create: { userId: admin.id, name: "VGMF Admin" },
  });

  await prisma.user.upsert({
    where: { email: "committee@vgmf.org" },
    update: {},
    create: {
      userId: await generateUserId(),
      email: "committee@vgmf.org",
      passwordHash: await hashPassword("Committee@123"),
      role: "COMMITTEE",
      profile: { create: { name: "Dr. Research Committee" } },
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@vgmf.org" },
    update: {},
    create: {
      userId: await generateUserId(),
      email: "staff@vgmf.org",
      passwordHash: await hashPassword("Staff@123"),
      role: "STAFF",
      profile: { create: { name: "Foundation Staff" } },
    },
  });

  await prisma.user.upsert({
    where: { email: "trustee@vgmf.org" },
    update: {},
    create: {
      userId: await generateUserId(),
      email: "trustee@vgmf.org",
      passwordHash: await hashPassword("Trustee@123"),
      role: "TRUSTEE",
      profile: { create: { name: "Board Trustee" } },
    },
  });

  console.log("Seed completed:");
  console.log("  Admin: admin@vaidyagogate.org / Admin@2026");
  console.log("  Committee: committee@vgmf.org / Committee@123");
  console.log("  Staff: staff@vgmf.org / Staff@123");
  console.log("  Trustee: trustee@vgmf.org / Trustee@123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
