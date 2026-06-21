import { getSiteSettings } from "@/lib/cms";
import { SupportContent } from "@/components/applicant/SupportContent";

export default async function SupportPage() {
  const settings = await getSiteSettings();

  return (
    <SupportContent
      contactEmail={settings.contactEmail || "info@vaidyagogate.org"}
      contactPhone={settings.contactPhone || ""}
    />
  );
}
