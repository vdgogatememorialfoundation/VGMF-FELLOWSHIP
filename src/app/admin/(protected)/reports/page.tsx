export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-gray-600">Export reports to Excel/PDF</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          "Applicant List",
          "Reviewer Scores",
          "Fellowship Awards",
          "Progress Reports",
          "Fund Utilization",
          "Publications",
        ].map((report) => (
          <div key={report} className="card">
            <h3 className="font-semibold">{report}</h3>
            <p className="mt-2 text-sm text-gray-600">Generate and download report</p>
            <div className="mt-4 flex gap-2">
              <button className="btn-secondary text-xs">Export Excel</button>
              <button className="btn-secondary text-xs">Export PDF</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
