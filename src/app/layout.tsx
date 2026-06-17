import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Libre_Baskerville, Outfit } from "next/font/google";
import "./globals.css";
import { SITE_NAME } from "@/lib/constants";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const display = Outfit({ subsets: ["latin"], variable: "--font-display" });
const serif = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
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
      <body className={`${sans.variable} ${display.variable} ${serif.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
