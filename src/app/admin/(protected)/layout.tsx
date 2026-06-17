import { AdminLayout as AdminShell } from "@/components/layout/PortalLayout";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
