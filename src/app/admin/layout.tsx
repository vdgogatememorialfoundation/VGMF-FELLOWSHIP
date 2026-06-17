import { AdminLayout as AdminShell } from "@/components/layout/PortalLayout";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
