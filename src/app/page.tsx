import { PublicHeader, PublicFooter, NoticesSection } from "@/components/public/PublicLayout";
import { PublicMaintenanceGate } from "@/components/public/PublicMaintenanceGate";
import { FaqSection } from "@/components/public/FaqSection";
import { SeoJsonLd } from "@/components/public/SeoJsonLd";
import {
  HomeHero,
  HomeTrustStrip,
  HomeHighlights,
  HomeJourney,
  HomeCtaBand,
  HomeAboutContact,
} from "@/components/public/HomeSections";
import { getSiteSettings } from "@/lib/cms";
import {
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  getPublicSiteUrl,
} from "@/lib/seo";
import { resolveSeoConfig } from "@/lib/seo-config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSiteSettings();
  const siteUrl = await getPublicSiteUrl();
  const seo = resolveSeoConfig(settings);

  return (
    <PublicMaintenanceGate>
      {seo.structuredDataEnabled && (
        <SeoJsonLd
          data={[
            buildOrganizationJsonLd(settings, siteUrl),
            buildWebsiteJsonLd(siteUrl),
            buildFaqJsonLd(settings.faqItems),
          ]}
        />
      )}
      <div className="min-h-screen mesh-bg">
        <PublicHeader />
        <HomeHero settings={settings} />
        <HomeTrustStrip settings={settings} />
        <NoticesSection />
        <HomeHighlights settings={settings} />
        <HomeJourney settings={settings} />
        <FaqSection
          title={settings.faqTitle}
          subtitle={settings.faqSubtitle}
          items={settings.faqItems}
        />
        <HomeCtaBand settings={settings} />
        <HomeAboutContact settings={settings} />
        <PublicFooter />
      </div>
    </PublicMaintenanceGate>
  );
}
