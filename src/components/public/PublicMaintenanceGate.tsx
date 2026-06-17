import { getMaintenanceSettings } from "@/lib/maintenance";
import { MaintenancePage } from "./MaintenancePage";

export async function PublicMaintenanceGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const maintenance = await getMaintenanceSettings();

  if (maintenance.enabled) {
    return <MaintenancePage message={maintenance.message} />;
  }

  return <>{children}</>;
}
