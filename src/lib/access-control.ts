import { getSiteSettings } from "./cms";

export const DEFAULT_SIGNUP_DISABLED_MESSAGE =
  "New applicant registration is currently closed. Please check official notices for updates.";
export const DEFAULT_LOGIN_DISABLED_MESSAGE =
  "Applicant login is temporarily unavailable. Please try again later or contact the foundation.";

export async function getAccessControl() {
  const settings = await getSiteSettings();

  return {
    signupEnabled: settings.signupEnabled,
    loginEnabled: settings.loginEnabled,
    signupDisabledMessage:
      settings.signupDisabledMessage || DEFAULT_SIGNUP_DISABLED_MESSAGE,
    loginDisabledMessage:
      settings.loginDisabledMessage || DEFAULT_LOGIN_DISABLED_MESSAGE,
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
