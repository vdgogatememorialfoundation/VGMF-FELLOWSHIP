import { TrusteeLayout as TrusteeShell } from "@/components/layout/PortalLayout";

export default async function TrusteeRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TrusteeShell>{children}</TrusteeShell>;
}
