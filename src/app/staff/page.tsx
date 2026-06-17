import prisma from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { PortalGate } from "@/components/auth/PortalGate";

async function StaffDashboard() {
  const financeRecords = await prisma.financeRecord.findMany({
    include: { fellowship: true },
  });

  const totalSanctioned = financeRecords.reduce((s, r) => s + r.sanctionedAmount, 0);
  const totalReleased = financeRecords.reduce((s, r) => s + r.releasedAmount, 0);
  const totalBalance = financeRecords.reduce((s, r) => s + r.balanceAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
        <p className="mt-1 text-gray-600">Finance and operations overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">Sanctioned Amount</p>
          <p className="text-2xl font-bold">{formatCurrency(totalSanctioned)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Released Amount</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReleased)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Balance Amount</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalBalance)}</p>
        </div>
      </div>
    </div>
  );
}

export default async function StaffPage() {
  return (
    <PortalGate portal="staff">
      <StaffDashboard />
    </PortalGate>
  );
}
