"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Activity,
  HelpCircle,
  LogOut,
  User,
  Users,
  BarChart3,
  ClipboardList,
  Award,
  DollarSign,
  FileBarChart,
  Globe,
  UserCog,
  FormInput,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import { PORTAL_DASHBOARD_PATHS, type PortalType } from "@/lib/portal";

interface SidebarProps {
  user: SessionUser;
  portal: PortalType;
}

const portalLinks: Record<PortalType, { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  applicant: [
    { href: "/applicant", label: "Dashboard", icon: LayoutDashboard },
    { href: "/applicant/forms", label: "Forms", icon: FileText },
    { href: "/applicant/status", label: "Applicant State", icon: Activity },
    { href: "/applicant/support", label: "Support", icon: HelpCircle },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/website", label: "Website Updates", icon: Globe },
    { href: "/admin/forms", label: "Form Builder", icon: FormInput },
    { href: "/admin/applications", label: "Applications", icon: ClipboardList },
    { href: "/admin/applicants", label: "Applicants", icon: Users },
    { href: "/admin/users", label: "Portal Users", icon: UserCog },
    { href: "/admin/fellowships", label: "Fellowships", icon: Award },
    { href: "/admin/reports", label: "Reports", icon: FileBarChart },
  ],
  staff: [
    { href: "/staff", label: "Dashboard", icon: LayoutDashboard },
    { href: "/staff/applications", label: "Applications", icon: ClipboardList },
    { href: "/staff/finance", label: "Finance", icon: DollarSign },
    { href: "/staff/reports", label: "Reports", icon: BarChart3 },
  ],
  reviewer: [
    { href: "/reviewer", label: "Dashboard", icon: LayoutDashboard },
    { href: "/reviewer/applications", label: "Applications", icon: ClipboardList },
    { href: "/reviewer/rankings", label: "Rankings", icon: BarChart3 },
  ],
  trustee: [
    { href: "/trustee", label: "Dashboard", icon: LayoutDashboard },
    { href: "/trustee/approvals", label: "Approvals", icon: Award },
  ],
};

const portalLabels: Record<PortalType, string> = {
  applicant: "Applicant",
  admin: "Admin",
  staff: "Staff",
  reviewer: "Reviewer",
  trustee: "Trustee",
};

export function Sidebar({ user, portal }: SidebarProps) {
  const pathname = usePathname();
  const links = portalLinks[portal];

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-6">
        <Link href={PORTAL_DASHBOARD_PATHS[portal]} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
            VG
          </div>
          <div>
            <p className="text-xs font-semibold leading-tight text-gray-900">VGMF Portal 2026</p>
            <p className="text-xs capitalize text-gray-500">{portalLabels[portal]}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href !== `/${portal}` && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn("sidebar-link", isActive && "sidebar-link-active")}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="mb-3 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">User ID</p>
          <p className="text-sm font-medium text-gray-900">{user.userId}</p>
        </div>
        <form action={`/api/auth/logout?portal=${portal}`} method="GET">
          <button
            type="submit"
            className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}

export function TopBar({ user, portal }: { user: SessionUser; portal: PortalType }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <p className="text-sm text-gray-500">
        Vaidya Gogate Memorial Foundation Fellowship Portal 2026
      </p>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <Link
          href={`/${portal}/profile`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 transition hover:bg-primary-200"
        >
          <User className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
