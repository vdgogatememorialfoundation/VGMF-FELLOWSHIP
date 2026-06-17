import { getAccessControl } from "@/lib/access-control";
import { AuthDisabledPanel } from "@/components/auth/AuthDisabledPanel";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
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
