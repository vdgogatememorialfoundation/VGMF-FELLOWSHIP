import type { Metadata } from "next";
import { buildPortalRobotsMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPortalRobotsMetadata();

export default function ReviewerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
