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
  ShieldCheck,
  MessageSquare,
  FilePlus,
  Menu,
  X,
  Bell,
  Inbox,
  Clipboard,
  Mail,
  CalendarClock,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import { PORTAL_DASHBOARD_PATHS, type PortalType } from "@/lib/portal";

import type { UserRole } from "@prisma/client";

interface SidebarProps {
  user: SessionUser;
  portal: PortalType;
  hiddenModules?: string[];
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const portalLinks: Record<PortalType, { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  applicant: [
    { href: "/applicant", label: "Dashboard", icon: LayoutDashboard },
    { href: "/applicant/forms", label: "Application Form", icon: FileText },
    { href: "/applicant/undertaking", label: "Digital Undertaking", icon: FileText },
    { href: "/applicant/verification", label: "Identity Verification", icon: ShieldCheck },
    { href: "/applicant/status", label: "Application Tracking", icon: Activity },
    { href: "/applicant/interview", label: "My Interview", icon: CalendarClock },
    { href: "/applicant/fellowship", label: "My Fellowship", icon: Award },
    { href: "/applicant/support", label: "Support", icon: HelpCircle },
    { href: "/applicant/inbox", label: "Inbox", icon: Inbox },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/website", label: "Website Updates", icon: Globe },
    { href: "/admin/forms", label: "Application Forms", icon: FormInput },
    { href: "/admin/support", label: "Support Tickets", icon: MessageSquare },
    { href: "/admin/accounts", label: "All Accounts", icon: Users },
    { href: "/admin/applications", label: "Applications", icon: ClipboardList },
    { href: "/admin/applications/new", label: "New Application", icon: FilePlus },
    { href: "/admin/applicants", label: "Applicants", icon: UserCog },
    { href: "/admin/users", label: "Portal Users", icon: UserCog },
    { href: "/admin/scoring", label: "Scoring Criteria", icon: Clipboard },
    { href: "/admin/scoring/all", label: "Score Dashboard", icon: BarChart3 },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
    { href: "/admin/email-campaigns", label: "Email Campaigns", icon: Mail },
    { href: "/admin/interviews", label: "Interviews", icon: CalendarClock },
    { href: "/admin/inbox", label: "Inbox", icon: Inbox },
    { href: "/admin/fellowships", label: "Fellowships", icon: Award },
    { href: "/admin/permissions", label: "Role Permissions", icon: ShieldCheck },
    { href: "/admin/reports", label: "Reports", icon: FileBarChart },
    { href: "/admin/backup", label: "Data Backup", icon: Database },
  ],
  staff: [
    { href: "/staff", label: "Dashboard", icon: LayoutDashboard },
    { href: "/staff/applications", label: "Applications", icon: ClipboardList },
    { href: "/staff/support", label: "Support Tickets", icon: MessageSquare },
    { href: "/staff/inbox", label: "Inbox", icon: Inbox },
    { href: "/staff/finance", label: "Finance", icon: DollarSign },
    { href: "/staff/reports", label: "Reports", icon: BarChart3 },
  ],
  reviewer: [
    { href: "/reviewer", label: "Dashboard", icon: LayoutDashboard },
    { href: "/reviewer/applications", label: "Applications", icon: ClipboardList },
    { href: "/reviewer/rankings", label: "Rankings", icon: BarChart3 },
    { href: "/reviewer/inbox", label: "Inbox", icon: Inbox },
  ],
  committee: [
    { href: "/committee", label: "Dashboard", icon: LayoutDashboard },
    { href: "/committee/applications", label: "Applications", icon: ClipboardList },
    { href: "/committee/scores", label: "Score Applications", icon: Clipboard },
    { href: "/committee/inbox", label: "Inbox", icon: Inbox },
  ],
  trustee: [
    { href: "/trustee", label: "Dashboard", icon: LayoutDashboard },
    { href: "/trustee/approvals", label: "Approvals", icon: Award },
    { href: "/trustee/inbox", label: "Inbox", icon: Inbox },
  ],
};

const portalLabels: Record<PortalType, string> = {
  applicant: "Applicant",
  admin: "Admin",
  staff: "Staff",
  reviewer: "Reviewer",
  committee: "Research Committee",
  trustee: "Trustee",
};

export function Sidebar({ user, portal, hiddenModules = [], mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const links = portalLinks[portal];

  return (
    <aside
      className={cn(
        "flex w-64 max-w-[85vw] flex-col border-r border-gray-200 bg-white",
        "fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out lg:static lg:z-auto lg:max-w-none lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-200 p-4 sm:p-6">
        <Link
          href={PORTAL_DASHBOARD_PATHS[portal]}
          className="flex items-center gap-2"
          onClick={onMobileClose}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
            VG
          </div>
          <div>
            <p className="text-xs font-semibold leading-tight text-gray-900">VGMF Portal 2026</p>
            <p className="text-xs capitalize text-gray-500">{portalLabels[portal]}</p>
          </div>
        </Link>
        <button
          type="button"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          aria-label="Close menu"
          onClick={onMobileClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {links
          .filter((link) => !hiddenModules.includes(link.href))
          .map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href !== `/${portal}` && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onMobileClose}
              className={cn("sidebar-link", isActive && "sidebar-link-active")}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="mb-3 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">User ID</p>
          <p className="truncate text-sm font-medium text-gray-900">{user.userId}</p>
        </div>
        <form action={`/api/auth/logout?portal=${portal}`} method="GET">
          <button
            type="submit"
            className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}

export function TopBar({
  user,
  portal,
  onMenuOpen,
}: {
  user: SessionUser;
  portal: PortalType;
  onMenuOpen?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 sm:h-16 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          aria-label="Open navigation menu"
          onClick={onMenuOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="truncate text-xs text-gray-500 sm:text-sm">
          <span className="hidden sm:inline">Vaidya Gogate Memorial Foundation Fellowship Portal 2026</span>
          <span className="sm:hidden">VGMF Fellowship 2026</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <Link
          href={`/${portal}/profile`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 transition hover:bg-primary-200 sm:h-10 sm:w-10"
          aria-label="Profile"
        >
          <User className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
