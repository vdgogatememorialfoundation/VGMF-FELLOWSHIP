import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateUserId } from "../src/lib/numeric-id";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = "Admin@2026";
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const existing = await prisma.user.findUnique({
    where: { email: "admin@vaidyagogate.org" },
  });
  const userId = existing?.userId ?? (await generateUserId());

  const admin = await prisma.user.upsert({
    where: { email: "admin@vaidyagogate.org" },
    update: { passwordHash, adminPassword, role: "ADMIN", isActive: true },
    create: {
      userId,
      email: "admin@vaidyagogate.org",
      passwordHash,
      adminPassword,
      role: "ADMIN",
      profile: { create: { name: "VGMF Admin" } },
    },
    include: { profile: true },
  });

  console.log("Admin updated:", admin.email, "User ID:", admin.userId);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
