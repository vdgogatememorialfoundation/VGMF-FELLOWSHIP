import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_NAME } from "@/lib/constants";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: SITE_NAME,
  description:
    "Vaidya Gogate Memorial Foundation Fellowship Portal 2026 — Apply for Ayurvedic research fellowships",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50 text-gray-900`}>
        {children}
      </body>
    </html>
  );
}
