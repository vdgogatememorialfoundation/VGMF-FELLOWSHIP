import prisma from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { PortalGate } from "@/components/auth/PortalGate";
import {
  ClipboardList,
  Eye,
  Star,
  CheckCircle,
  Users,
  Award,
  DollarSign,
  Clock,
  AlertTriangle,
} from "lucide-react";

async function AdminDashboard() {
  const reviewStatuses = [
    "SCRUTINY",
    "ELIGIBILITY_CHECK",
    "UNDER_REVIEW",
    "TECHNICAL_SCORING",
    "QUERY_RAISED",
  ] as const;

  const [
    totalApplications,
    underReview,
    shortlisted,
    selected,
    activeFellows,
    completedProjects,
    fundsSanctioned,
    fundsReleased,
    pendingRelease,
    queryRaised,
    suspended,
  ] = await Promise.all([
    prisma.application.count(),
    prisma.application.count({ where: { status: { in: [...reviewStatuses] } } }),
    prisma.application.count({
      where: { status: { in: ["SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"] } },
    }),
    prisma.application.count({
      where: { status: { in: ["SELECTED", "AGREEMENT_PENDING", "COMPLETED"] } },
    }),
    prisma.fellowship.count({ where: { isActive: true, isCompleted: false } }),
    prisma.fellowship.count({ where: { isCompleted: true } }),
    prisma.financeRecord.aggregate({ _sum: { sanctionedAmount: true } }),
    prisma.fundInstallment.aggregate({
      where: { status: "RELEASED" },
      _sum: { amount: true },
    }),
    prisma.fundInstallment.aggregate({
      where: { status: { in: ["PENDING", "APPROVED"] } },
      _sum: { amount: true },
    }),
    prisma.application.count({ where: { status: "QUERY_RAISED" } }),
    prisma.application.count({ where: { status: "SUSPENDED" } }),
  ]);

  const stats = [
    { label: "Applications Received", value: totalApplications, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
    { label: "Under Review", value: underReview, icon: Eye, color: "text-yellow-600 bg-yellow-50" },
    { label: "Shortlisted", value: shortlisted, icon: Star, color: "text-purple-600 bg-purple-50" },
    { label: "Selected", value: selected, icon: CheckCircle, color: "text-green-600 bg-green-50" },
    { label: "Active Fellows", value: activeFellows, icon: Users, color: "text-indigo-600 bg-indigo-50" },
    { label: "Completed Projects", value: completedProjects, icon: Award, color: "text-orange-600 bg-orange-50" },
    { label: "Funds Sanctioned", value: formatCurrency(fundsSanctioned._sum.sanctionedAmount ?? 0), icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
    { label: "Funds Released", value: formatCurrency(fundsReleased._sum.amount ?? 0), icon: DollarSign, color: "text-teal-600 bg-teal-50" },
    { label: "Pending Releases", value: formatCurrency(pendingRelease._sum.amount ?? 0), icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Queries Raised", value: queryRaised, icon: AlertTriangle, color: "text-orange-600 bg-orange-50" },
    { label: "Suspended", value: suspended, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  ];

  const recentApplications = await prisma.application.findMany({
    take: 8,
    orderBy: { updatedAt: "desc" },
    include: { user: { include: { profile: true } } },
  });

  const statusBreakdown = await prisma.application.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Grant management — application → review → funding → completion
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold">Recent Applications</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-4">Application #</th>
                  <th className="pb-3 pr-4">Applicant</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((app) => (
                  <tr key={app.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{app.applicationNumber}</td>
                    <td className="py-3 pr-4">{app.user.profile?.name ?? app.name}</td>
                    <td className="py-3 pr-4">
                      <span className="text-xs">{app.status.replace(/_/g, " ")}</span>
                    </td>
                    <td className="py-3">{new Date(app.updatedAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold">Status Breakdown</h2>
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm">
            {statusBreakdown
              .sort((a, b) => b._count.status - a._count.status)
              .map((row) => (
                <li key={row.status} className="flex justify-between border-b py-2">
                  <span>{row.status.replace(/_/g, " ")}</span>
                  <span className="font-semibold">{row._count.status}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  return (
    <PortalGate portal="admin">
      <AdminDashboard />
    </PortalGate>
  );
}
