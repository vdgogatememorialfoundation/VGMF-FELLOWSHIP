import Link from "next/link";
import { PublicHeader, PublicFooter, NoticesSection } from "@/components/public/PublicLayout";
import { HomeHero } from "@/components/public/HomeHero";
import { HomeBento } from "@/components/public/HomeBento";
import { HomeTimeline } from "@/components/public/HomeTimeline";
import { HomeAbout, HomeCta } from "@/components/public/HomeCta";
import { HomeFaq } from "@/components/public/HomeFaq";
import { getSiteSettings } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSiteSettings();

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <HomeHero
        title={settings.heroTitle || "VGMF Research Fellowship 2026"}
        subtitle={
          settings.heroSubtitle ||
          "Apply for research fellowships in Ayurvedic medicine with grants up to ₹75,000."
        }
      />
      <NoticesSection />
      <HomeBento />
      <HomeTimeline />
      <HomeAbout />
      <HomeFaq />
      <HomeCta />
      <PublicFooter />
    </div>
  );
}
