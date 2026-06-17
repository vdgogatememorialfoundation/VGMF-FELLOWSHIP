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
  Settings,
  ClipboardList,
  Award,
  DollarSign,
  FileBarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

interface SidebarProps {
  user: SessionUser;
  portal: "applicant" | "admin" | "staff" | "committee" | "trustee";
}

const portalLinks = {
  applicant: [
    { href: "/applicant", label: "Dashboard", icon: LayoutDashboard },
    { href: "/applicant/forms", label: "Forms", icon: FileText },
    { href: "/applicant/status", label: "Applicant State", icon: Activity },
    { href: "/applicant/support", label: "Support", icon: HelpCircle },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/applications", label: "Applications", icon: ClipboardList },
    { href: "/admin/applicants", label: "Applicants", icon: Users },
    { href: "/admin/fellowships", label: "Fellowships", icon: Award },
    { href: "/admin/reports", label: "Reports", icon: FileBarChart },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
  staff: [
    { href: "/staff", label: "Dashboard", icon: LayoutDashboard },
    { href: "/staff/applications", label: "Applications", icon: ClipboardList },
    { href: "/staff/finance", label: "Finance", icon: DollarSign },
    { href: "/staff/reports", label: "Reports", icon: BarChart3 },
  ],
  committee: [
    { href: "/committee", label: "Dashboard", icon: LayoutDashboard },
    { href: "/committee/applications", label: "Applications", icon: ClipboardList },
    { href: "/committee/rankings", label: "Rankings", icon: BarChart3 },
  ],
  trustee: [
    { href: "/trustee", label: "Dashboard", icon: LayoutDashboard },
    { href: "/trustee/approvals", label: "Approvals", icon: Award },
  ],
};

export function Sidebar({ user, portal }: SidebarProps) {
  const pathname = usePathname();
  const links = portalLinks[portal];

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
            V
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">VGMF Portal</p>
            <p className="text-xs capitalize text-gray-500">{portal}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
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
        <form action="/api/auth/logout" method="GET">
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

export function TopBar({ user }: { user: SessionUser }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <Link
          href={
            user.role === "APPLICANT"
              ? "/applicant/profile"
              : `/admin/profile`
          }
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 transition hover:bg-primary-200"
        >
          <User className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
