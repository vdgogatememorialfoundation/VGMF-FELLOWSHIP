import { redirect } from "next/navigation";
import { getSession, getPortalPath } from "@/lib/auth";
import { getAccessControl } from "@/lib/access-control";
import { PortalLoginForm } from "@/components/auth/PortalLoginForm";
import { AuthDisabledPanel } from "@/components/auth/AuthDisabledPanel";
import { PortalLayout } from "@/components/layout/PortalLayout";
import type { PortalType } from "@/lib/portal";
import { PORTAL_ALLOWED_ROLES } from "@/lib/portal";

export async function PortalGate({
  portal,
  children,
  showRegisterLink,
}: {
  portal: PortalType;
  children: React.ReactNode;
  showRegisterLink?: boolean;
}) {
  const user = await getSession();
  const access = await getAccessControl();

  if (!user) {
    if (portal === "applicant" && !access.loginEnabled) {
      return (
        <AuthDisabledPanel
          title="Applicant Login Disabled"
          message={access.loginDisabledMessage}
        />
      );
    }

    return (
      <PortalLoginForm
        portal={portal}
        showRegisterLink={showRegisterLink && access.signupEnabled}
      />
    );
  }

  const allowedRoles = PORTAL_ALLOWED_ROLES[portal];
  if (!allowedRoles.includes(user.role)) {
    redirect(getPortalPath(user.role));
  }

  return (
    <PortalLayout user={user} portal={portal}>
      {children}
    </PortalLayout>
  );
}
