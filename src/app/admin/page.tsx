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
} from "lucide-react";

async function AdminDashboard() {
  const [
    totalApplications,
    underReview,
    shortlisted,
    selected,
    activeFellows,
    completedProjects,
    fundsReleased,
  ] = await Promise.all([
    prisma.application.count(),
    prisma.application.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.application.count({ where: { status: "SHORTLISTED" } }),
    prisma.application.count({ where: { status: "SELECTED" } }),
    prisma.fellowship.count({ where: { isActive: true, isCompleted: false } }),
    prisma.fellowship.count({ where: { isCompleted: true } }),
    prisma.fundInstallment.aggregate({
      where: { status: "RELEASED" },
      _sum: { amount: true },
    }),
  ]);

  const stats = [
    { label: "Total Applications", value: totalApplications, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
    { label: "Under Review", value: underReview, icon: Eye, color: "text-yellow-600 bg-yellow-50" },
    { label: "Shortlisted", value: shortlisted, icon: Star, color: "text-purple-600 bg-purple-50" },
    { label: "Selected", value: selected, icon: CheckCircle, color: "text-green-600 bg-green-50" },
    { label: "Active Fellows", value: activeFellows, icon: Users, color: "text-indigo-600 bg-indigo-50" },
    { label: "Completed Projects", value: completedProjects, icon: Award, color: "text-orange-600 bg-orange-50" },
    { label: "Funds Released", value: formatCurrency(fundsReleased._sum.amount ?? 0), icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
  ];

  const recentApplications = await prisma.application.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { user: { include: { profile: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-gray-600">Foundation staff overview and statistics</p>
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

      <div className="card">
        <h2 className="text-lg font-semibold">Recent Applications</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 pr-4">Application #</th>
                <th className="pb-3 pr-4">Applicant</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentApplications.map((app) => (
                <tr key={app.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{app.applicationNumber}</td>
                  <td className="py-3 pr-4">{app.user.profile?.name ?? app.name}</td>
                  <td className="py-3 pr-4">{app.status.replace(/_/g, " ")}</td>
                  <td className="py-3">{new Date(app.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
              {recentApplications.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">No applications yet</td>
                </tr>
              )}
            </tbody>
          </table>
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
