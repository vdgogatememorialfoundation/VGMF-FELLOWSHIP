import { PortalGate } from "@/components/auth/PortalGate";
import { ReviewerDashboard } from "@/components/reviewer/ReviewerDashboard";

export default function CommitteePage() {
  return (
    <PortalGate portal="committee">
      <ReviewerDashboard />
    </PortalGate>
  );
}
