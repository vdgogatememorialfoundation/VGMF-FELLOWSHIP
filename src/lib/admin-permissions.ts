import prisma from "./db";
import type { UserRole } from "@prisma/client";

export async function getHiddenModulesForRole(role: UserRole): Promise<string[]> {
  const overrides = await prisma.roleModuleVisibility.findMany({
    where: { role, isVisible: false },
    select: { module: true },
  });
  return overrides.map((o) => o.module);
}

export async function getAllRoleModuleVisibilities() {
  return prisma.roleModuleVisibility.findMany();
}

export async function setRoleModuleVisibility(role: UserRole, module: string, isVisible: boolean) {
  return prisma.roleModuleVisibility.upsert({
    where: {
      role_module: {
        role,
        module,
      },
    },
    update: { isVisible },
    create: { role, module, isVisible },
  });
}
