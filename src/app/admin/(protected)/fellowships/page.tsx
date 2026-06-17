import prisma from "@/lib/db";
import { AdminFellowshipsClient } from "@/components/admin/AdminFellowshipsClient";

export default async function AdminFellowshipsPage() {
  const fellowships = await prisma.fellowship.findMany({
    include: {
      application: { select: { applicationNumber: true } },
      installments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return <AdminFellowshipsClient fellowships={fellowships} />;
}
