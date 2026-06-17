import { CommitteeLayout as CommitteeShell } from "@/components/layout/PortalLayout";

export default async function CommitteeRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommitteeShell>{children}</CommitteeShell>;
}
