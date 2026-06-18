import { redirect } from "next/navigation";
import { getSession, getPortalPath } from "@/lib/auth";
import { PortalChrome } from "@/components/layout/PortalChrome";
import type { UserRole } from "@prisma/client";
import type { PortalType } from "@/lib/portal";
import { getLoginPath } from "@/lib/portal";

export async function requireAuth(allowedRoles?: UserRole[], portal?: PortalType) {
  const user = await getSession();
  if (!user) {
    redirect(portal ? getLoginPath(portal) : "/applicant");
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect(getPortalPath(user.role));
  }

  return user;
}

export function PortalLayout({
  user,
  portal,
  children,
}: {
  user: Awaited<ReturnType<typeof requireAuth>>;
  portal: PortalType;
  children: React.ReactNode;
}) {
  return (
    <PortalChrome user={user} portal={portal}>
      {children}
    </PortalChrome>
  );
}

export async function ApplicantLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth(["APPLICANT"], "applicant");
  return <PortalLayout user={user} portal="applicant">{children}</PortalLayout>;
}

export async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth(["ADMIN"], "admin");
  return <PortalLayout user={user} portal="admin">{children}</PortalLayout>;
}

export async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth(["STAFF", "FINANCE"], "staff");
  return <PortalLayout user={user} portal="staff">{children}</PortalLayout>;
}

export async function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth(["COMMITTEE"], "reviewer");
  return <PortalLayout user={user} portal="reviewer">{children}</PortalLayout>;
}

export async function CommitteeLayout({ children }: { children: React.ReactNode }) {
  return <ReviewerLayout>{children}</ReviewerLayout>;
}

export async function TrusteeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth(["TRUSTEE"], "trustee");
  return <PortalLayout user={user} portal="trustee">{children}</PortalLayout>;
}
