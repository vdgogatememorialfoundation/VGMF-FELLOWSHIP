import { Suspense } from "react";
import { WebsiteUpdates } from "@/components/admin/WebsiteUpdates";

export default function AdminWebsitePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading website settings…</div>}>
      <WebsiteUpdates />
    </Suspense>
  );
}
