import { redirect } from "next/navigation";
import { getSession, getPortalPath } from "@/lib/auth";
import { getAccessControl } from "@/lib/access-control";
import { getMaintenanceSettings, isApplicantPortalMaintenanceActive } from "@/lib/maintenance";
import { PortalLoginForm } from "@/components/auth/PortalLoginForm";
import { AuthDisabledPanel } from "@/components/auth/AuthDisabledPanel";
import { MaintenancePage } from "@/components/public/MaintenancePage";
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
    if (portal === "applicant" && (await isApplicantPortalMaintenanceActive())) {
      const maintenance = await getMaintenanceSettings();
      return (
        <MaintenancePage
          message={maintenance.message}
          showPortalHint={false}
        />
      );
    }

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
        loginPasswordEnabled={access.loginPasswordEnabled}
        loginOtpWhatsappEnabled={access.loginOtpWhatsappEnabled}
        loginOtpEmailEnabled={access.loginOtpEmailEnabled}
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
