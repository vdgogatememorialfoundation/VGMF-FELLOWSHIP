import { StaffLayout as StaffShell } from "@/components/layout/PortalLayout";

export default async function StaffRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StaffShell>{children}</StaffShell>;
}
