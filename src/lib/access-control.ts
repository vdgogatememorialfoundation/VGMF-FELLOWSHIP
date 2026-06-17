import { getSiteSettings } from "./cms";

export const DEFAULT_SIGNUP_DISABLED_MESSAGE =
  "New applicant registration is currently closed. Please check official notices for updates.";
export const DEFAULT_LOGIN_DISABLED_MESSAGE =
  "Applicant login is temporarily unavailable. Please try again later or contact the foundation.";

export type OtpChannel = "phone" | "email";

export async function getAccessControl() {
  const settings = await getSiteSettings();

  return {
    signupEnabled: settings.signupEnabled,
    loginEnabled: settings.loginEnabled,
    signupDisabledMessage:
      settings.signupDisabledMessage || DEFAULT_SIGNUP_DISABLED_MESSAGE,
    loginDisabledMessage:
      settings.loginDisabledMessage || DEFAULT_LOGIN_DISABLED_MESSAGE,
    signupOtpEmailEnabled: settings.signupOtpEmailEnabled,
    signupOtpWhatsappEnabled: settings.signupOtpWhatsappEnabled,
    applicationNotifyEmailEnabled: settings.applicationNotifyEmailEnabled,
    applicationNotifyWhatsappEnabled: settings.applicationNotifyWhatsappEnabled,
    welcomeEmailEnabled: settings.welcomeEmailEnabled,
    welcomeWhatsappEnabled: settings.welcomeWhatsappEnabled,
    alertsEmailEnabled: settings.alertsEmailEnabled,
    alertsWhatsappEnabled: settings.alertsWhatsappEnabled,
    statusNotifyEmailEnabled: settings.statusNotifyEmailEnabled,
    statusNotifyWhatsappEnabled: settings.statusNotifyWhatsappEnabled,
    maintenanceModeEnabled: settings.maintenanceModeEnabled,
    maintenanceMessage: settings.maintenanceMessage,
    maintenanceAllowPortals: settings.maintenanceAllowPortals,
  };
}

export async function assertSignupEnabled() {
  const access = await getAccessControl();
  if (!access.signupEnabled) {
    return { allowed: false as const, message: access.signupDisabledMessage };
  }
  return { allowed: true as const };
}

export async function assertApplicantLoginEnabled() {
  const access = await getAccessControl();
  if (!access.loginEnabled) {
    return { allowed: false as const, message: access.loginDisabledMessage };
  }
  return { allowed: true as const };
}

export async function assertSignupOtpChannel(channel: OtpChannel) {
  const access = await getAccessControl();

  if (channel === "email" && !access.signupOtpEmailEnabled) {
    return {
      allowed: false as const,
      message: "Email OTP verification is currently disabled for registration.",
    };
  }

  if (channel === "phone" && !access.signupOtpWhatsappEnabled) {
    return {
      allowed: false as const,
      message: "WhatsApp OTP verification is currently disabled for registration.",
    };
  }

  return { allowed: true as const };
}

export function isEmailAlertsEnabled(access: Awaited<ReturnType<typeof getAccessControl>>) {
  return access.alertsEmailEnabled;
}

export function isWhatsappAlertsEnabled(access: Awaited<ReturnType<typeof getAccessControl>>) {
  return access.alertsWhatsappEnabled;
}
