import { getAccessControl } from "@/lib/access-control";
import { getMaintenanceSettings } from "@/lib/maintenance";
import { AuthDisabledPanel } from "@/components/auth/AuthDisabledPanel";
import { MaintenancePage } from "@/components/public/MaintenancePage";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const maintenance = await getMaintenanceSettings();
  if (maintenance.enabled) {
    return <MaintenancePage message={maintenance.message} showPortalHint={false} />;
  }

  const access = await getAccessControl();

  if (!access.signupEnabled) {
    return (
      <AuthDisabledPanel
        title="Registration Closed"
        message={access.signupDisabledMessage}
      />
    );
  }

  return (
    <RegisterForm
      loginEnabled={access.loginEnabled}
      signupOtpEmailEnabled={access.signupOtpEmailEnabled}
      signupOtpWhatsappEnabled={access.signupOtpWhatsappEnabled}
    />
  );
}
