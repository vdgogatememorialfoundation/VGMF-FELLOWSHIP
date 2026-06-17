import { TrusteeLayout as TrusteeShell } from "@/components/layout/PortalLayout";

export default async function TrusteeProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TrusteeShell>{children}</TrusteeShell>;
}
