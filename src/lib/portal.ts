import type { UserRole } from "@prisma/client";

export type PortalType = "applicant" | "admin" | "staff" | "reviewer" | "trustee" | "committee";

export const PORTAL_LOGIN_PATHS: Record<PortalType, string> = {
  applicant: "/applicant",
  admin: "/admin",
  staff: "/staff",
  reviewer: "/reviewer",
  trustee: "/trustee",
  committee: "/committee",
};

export const PORTAL_DASHBOARD_PATHS: Record<PortalType, string> = {
  applicant: "/applicant",
  admin: "/admin",
  staff: "/staff",
  reviewer: "/reviewer",
  trustee: "/trustee",
  committee: "/committee",
};

export const PORTAL_ALLOWED_ROLES: Record<PortalType, UserRole[]> = {
  applicant: ["APPLICANT", "ADMIN"],
  admin: ["ADMIN"],
  staff: ["STAFF", "FINANCE", "COADMIN", "ADMIN"],
  reviewer: ["COMMITTEE", "ADMIN"],
  trustee: ["TRUSTEE", "ADMIN"],
  committee: ["COMMITTEE", "ADMIN"],
};

export const PORTAL_LABELS: Record<PortalType, string> = {
  applicant: "Applicant Portal",
  admin: "Admin Portal",
  staff: "Staff Portal",
  reviewer: "Reviewer Portal",
  trustee: "Trustee Portal",
  committee: "Research Committee Portal",
};

export function getLoginPath(portal: PortalType): string {
  return PORTAL_LOGIN_PATHS[portal];
}

export function roleToPortal(role: UserRole): PortalType {
  switch (role) {
    case "ADMIN":
      return "admin";
    case "STAFF":
    case "FINANCE":
    case "COADMIN":
      return "staff";
    case "COMMITTEE":
      return "committee";
    case "TRUSTEE":
      return "trustee";
    default:
      return "applicant";
  }
}
