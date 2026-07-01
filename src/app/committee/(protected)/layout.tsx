import { CommitteeLayout as CommitteeShell } from "@/components/layout/PortalLayout";

export default async function CommitteeProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommitteeShell>{children}</CommitteeShell>;
}
