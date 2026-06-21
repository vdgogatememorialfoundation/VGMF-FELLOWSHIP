import type { Metadata } from "next";
import { buildPortalRobotsMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPortalRobotsMetadata();

export default function TrusteeRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
