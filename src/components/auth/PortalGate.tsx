import { redirect } from "next/navigation";
import { getSession, getPortalPath } from "@/lib/auth";
import { PortalLoginForm } from "@/components/auth/PortalLoginForm";
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

  if (!user) {
    return <PortalLoginForm portal={portal} showRegisterLink={showRegisterLink} />;
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
