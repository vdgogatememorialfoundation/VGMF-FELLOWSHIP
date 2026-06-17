import { PortalGate } from "@/components/auth/PortalGate";
import { TrusteeApprovalsClient } from "@/components/trustee/TrusteeApprovalsClient";

export default function TrusteeApprovalsPage() {
  return (
    <PortalGate portal="trustee">
      <TrusteeApprovalsClient />
    </PortalGate>
  );
}
