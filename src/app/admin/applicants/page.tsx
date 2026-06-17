import prisma from "@/lib/db";
import Link from "next/link";

export default async function AdminApplicantsPage() {
  const applicants = await prisma.user.findMany({
    where: { role: "APPLICANT" },
    include: {
      profile: true,
      applications: { select: { id: true, applicationNumber: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
        <p className="mt-1 text-gray-600">All registered applicants</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4">User ID</th>
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Email</th>
              <th className="pb-3 pr-4">Phone</th>
              <th className="pb-3 pr-4">Applications</th>
              <th className="pb-3">Registered</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((a) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="py-3 pr-4 font-medium">{a.userId}</td>
                <td className="py-3 pr-4">{a.profile?.name ?? "—"}</td>
                <td className="py-3 pr-4">{a.email}</td>
                <td className="py-3 pr-4">{a.phone ?? "—"}</td>
                <td className="py-3 pr-4">{a.applications.length}</td>
                <td className="py-3">{new Date(a.createdAt).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
