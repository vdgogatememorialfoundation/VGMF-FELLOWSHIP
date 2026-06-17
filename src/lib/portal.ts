import type { UserRole } from "@prisma/client";

export type PortalType = "applicant" | "admin" | "staff" | "reviewer" | "trustee";

export const PORTAL_LOGIN_PATHS: Record<PortalType, string> = {
  applicant: "/applicant",
  admin: "/admin",
  staff: "/staff",
  reviewer: "/reviewer",
  trustee: "/trustee",
};

export const PORTAL_DASHBOARD_PATHS: Record<PortalType, string> = {
  applicant: "/applicant",
  admin: "/admin",
  staff: "/staff",
  reviewer: "/reviewer",
  trustee: "/trustee",
};

export const PORTAL_ALLOWED_ROLES: Record<PortalType, UserRole[]> = {
  applicant: ["APPLICANT"],
  admin: ["ADMIN"],
  staff: ["STAFF", "FINANCE"],
  reviewer: ["COMMITTEE"],
  trustee: ["TRUSTEE"],
};

export const PORTAL_LABELS: Record<PortalType, string> = {
  applicant: "Applicant Portal",
  admin: "Admin Portal",
  staff: "Staff Portal",
  reviewer: "Reviewer Portal",
  trustee: "Trustee Portal",
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
      return "staff";
    case "COMMITTEE":
      return "reviewer";
    case "TRUSTEE":
      return "trustee";
    default:
      return "applicant";
  }
}
