import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Libre_Baskerville, Outfit } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@/lib/cms";
import { buildRootMetadata } from "@/lib/seo";
import { resolveSeoConfig } from "@/lib/seo-config";
import { GoogleAnalytics } from "@/components/public/GoogleAnalytics";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const display = Outfit({ subsets: ["latin"], variable: "--font-display" });
const serif = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const metadata = await buildRootMetadata(settings);

  return {
    ...metadata,
    icons: settings.faviconUrl
      ? { icon: settings.faviconUrl, apple: settings.faviconUrl }
      : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: "#1b6b52",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const seo = resolveSeoConfig(settings);

  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} ${serif.variable} antialiased`}>
        <GoogleAnalytics measurementId={seo.googleAnalyticsId} />
        {children}
      </body>
    </html>
  );
}
