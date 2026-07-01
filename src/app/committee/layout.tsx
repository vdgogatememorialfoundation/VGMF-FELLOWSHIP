import type { Metadata } from "next";
import { CommitteeLayout } from "@/components/layout/PortalLayout";
import { buildPortalRobotsMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPortalRobotsMetadata();

export default async function CommitteeRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommitteeLayout>{children}</CommitteeLayout>;
}
