import { redirect } from "next/navigation";
import { getSession, getPortalPath } from "@/lib/auth";
import { Sidebar, TopBar } from "@/components/layout/Sidebar";
import type { UserRole } from "@prisma/client";

const rolePortalMap: Record<string, "applicant" | "admin" | "staff" | "committee" | "trustee"> = {
  APPLICANT: "applicant",
  ADMIN: "admin",
  STAFF: "staff",
  FINANCE: "staff",
  COMMITTEE: "committee",
  TRUSTEE: "trustee",
};

export async function requireAuth(allowedRoles?: UserRole[]) {
  const user = await getSession();
  if (!user) redirect("/login");

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
  portal: keyof typeof rolePortalMap extends string ? "applicant" | "admin" | "staff" | "committee" | "trustee" : never;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} portal={portal} />
      <div className="flex flex-1 flex-col">
        <TopBar user={user} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export async function ApplicantLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth(["APPLICANT"]);
  return (
    <PortalLayout user={user} portal="applicant">
      {children}
    </PortalLayout>
  );
}

export async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth(["ADMIN"]);
  return (
    <PortalLayout user={user} portal="admin">
      {children}
    </PortalLayout>
  );
}

export async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth(["STAFF", "FINANCE"]);
  return (
    <PortalLayout user={user} portal="staff">
      {children}
    </PortalLayout>
  );
}

export async function CommitteeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth(["COMMITTEE"]);
  return (
    <PortalLayout user={user} portal="committee">
      {children}
    </PortalLayout>
  );
}

export async function TrusteeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth(["TRUSTEE"]);
  return (
    <PortalLayout user={user} portal="trustee">
      {children}
    </PortalLayout>
  );
}
