import { ReviewerLayout as ReviewerShell } from "@/components/layout/PortalLayout";

export default async function ReviewerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReviewerShell>{children}</ReviewerShell>;
}
