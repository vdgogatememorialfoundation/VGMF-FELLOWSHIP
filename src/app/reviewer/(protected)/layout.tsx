import { ReviewerLayout as ReviewerShell } from "@/components/layout/PortalLayout";

export default async function ReviewerProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReviewerShell>{children}</ReviewerShell>;
}
