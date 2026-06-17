import { ApplicantLayout as ApplicantShell } from "@/components/layout/PortalLayout";

export default async function ApplicantProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ApplicantShell>{children}</ApplicantShell>;
}
