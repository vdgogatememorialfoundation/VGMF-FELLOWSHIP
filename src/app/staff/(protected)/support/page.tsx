import { requireAuth } from "@/components/layout/PortalLayout";
import { SupportTicketsWorkspace } from "@/components/support/SupportTicketsWorkspace";

export default async function StaffSupportPage() {
  await requireAuth(["STAFF", "FINANCE"], "staff");

  return (
    <div className="space-y-6">
      <SupportTicketsWorkspace mode="staff" />
    </div>
  );
}
