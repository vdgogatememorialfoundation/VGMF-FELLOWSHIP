import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@2026", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@vaidyagogate.org" },
    update: { passwordHash, role: "ADMIN", isActive: true },
    create: {
      userId: `VGMF-${new Date().getFullYear()}-00001`,
      email: "admin@vaidyagogate.org",
      passwordHash,
      role: "ADMIN",
      profile: { create: { name: "VGMF Admin" } },
    },
    include: { profile: true },
  });

  console.log("Admin updated:", admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
