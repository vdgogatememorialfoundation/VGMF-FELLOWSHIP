import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Libre_Baskerville, Outfit } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@/lib/cms";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const display = Outfit({ subsets: ["latin"], variable: "--font-display" });
const serif = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings.siteName,
    description: settings.siteTagline || "Vaidya Gogate Memorial Foundation Fellowship Portal 2026",
    themeColor: "#1b6b52",
    icons: settings.faviconUrl ? { icon: settings.faviconUrl } : undefined,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} ${serif.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
