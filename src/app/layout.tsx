import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Libre_Baskerville } from "next/font/google";
import "./globals.css";
import { SITE_NAME } from "@/lib/constants";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const display = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: SITE_NAME,
  description:
    "Vaidya Gogate Memorial Foundation Fellowship Portal 2026 — Research fellowships in Ayurvedic medicine",
  themeColor: "#1b6b52",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
