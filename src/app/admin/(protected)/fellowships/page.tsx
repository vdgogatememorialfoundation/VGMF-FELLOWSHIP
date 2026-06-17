import prisma from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

export default async function AdminFellowshipsPage() {
  const fellowships = await prisma.fellowship.findMany({
    include: {
      application: { select: { applicationNumber: true } },
      installments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fellowships</h1>
        <p className="mt-1 text-gray-600">Active and completed fellowship grants</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4">Fellowship ID</th>
              <th className="pb-3 pr-4">Fellow Name</th>
              <th className="pb-3 pr-4">Project</th>
              <th className="pb-3 pr-4">Amount</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Installments</th>
            </tr>
          </thead>
          <tbody>
            {fellowships.map((f) => (
              <tr key={f.id} className="border-b last:border-0">
                <td className="py-3 pr-4 font-medium">{f.fellowshipId}</td>
                <td className="py-3 pr-4">{f.fellowName}</td>
                <td className="py-3 pr-4">{f.projectTitle}</td>
                <td className="py-3 pr-4">{formatCurrency(f.sanctionedAmount)}</td>
                <td className="py-3 pr-4">
                  {f.isCompleted ? "Completed" : f.isActive ? "Active" : "Inactive"}
                </td>
                <td className="py-3">
                  {f.installments.filter((i) => i.status === "RELEASED").length}/{f.installments.length} released
                </td>
              </tr>
            ))}
            {fellowships.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">No fellowships yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
