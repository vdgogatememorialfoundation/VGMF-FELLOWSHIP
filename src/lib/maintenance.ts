import { getSiteSettings } from "./cms";

export const DEFAULT_MAINTENANCE_MESSAGE =
  "The VGMF Fellowship Portal is undergoing scheduled maintenance. Please check back shortly. Thank you for your patience.";

export async function getMaintenanceSettings() {
  const settings = await getSiteSettings();

  return {
    enabled: settings.maintenanceModeEnabled,
    message: settings.maintenanceMessage || DEFAULT_MAINTENANCE_MESSAGE,
    allowPortals: settings.maintenanceAllowPortals,
  };
}

export async function isPublicMaintenanceActive() {
  const maintenance = await getMaintenanceSettings();
  return maintenance.enabled;
}

export async function isApplicantPortalMaintenanceActive() {
  const maintenance = await getMaintenanceSettings();
  return maintenance.enabled && !maintenance.allowPortals;
}
