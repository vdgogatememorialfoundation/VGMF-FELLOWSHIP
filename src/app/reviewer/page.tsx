import { PortalGate } from "@/components/auth/PortalGate";
import { ReviewerDashboard } from "@/components/reviewer/ReviewerDashboard";

export default function ReviewerPage() {
  return (
    <PortalGate portal="reviewer">
      <ReviewerDashboard />
    </PortalGate>
  );
}
