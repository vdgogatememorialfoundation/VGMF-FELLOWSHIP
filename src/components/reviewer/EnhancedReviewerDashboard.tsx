"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  FileText,
  Users,
  BarChart3,
  Eye,
  ChevronRight,
  Filter,
  RefreshCw,
  Download,
} from "lucide-react";

interface ReviewerAssignment {
  id: string;
  applicationId: string;
  application: {
    id: string;
    applicationNumber: string;
    name: string;
    email: string;
    researchProposal?: {
      projectTitle: string;
      researchArea: string;
    };
    status: string;
  };
  status: string;
  deadline?: string;
  assignedAt: string;
  completedAt?: string;
  conflictDeclared?: boolean;
  review?: {
    id: string;
    isDraft: boolean;
    isSubmitted: boolean;
    totalScore?: number;
  };
}

interface DashboardStats {
  assigned: number;
  pending: number;
  completed: number;
  overdue: number;
  avgReviewTime: number;
  totalReviews: number;
  avgScoreGiven: number;
}

export function EnhancedReviewerDashboard() {
  const [assignments, setAssignments] = useState<ReviewerAssignment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    assigned: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
    avgReviewTime: 0,
    totalReviews: 0,
    avgScoreGiven: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "overdue">("all");
  const [activeTab, setActiveTab] = useState<"dashboard" | "matrix" | "history">("dashboard");

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/reviewer/assignments");
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    const isOverdue = a.deadline && new Date(a.deadline) < new Date() && a.status !== "SUBMITTED";
    switch (filter) {
      case "pending":
        return a.status === "PENDING" || a.status === "IN_PROGRESS";
      case "completed":
        return a.status === "SUBMITTED";
      case "overdue":
        return isOverdue;
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "PENDING":
        return "bg-gray-100 text-gray-800";
      case "DECLINED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDaysRemaining = (deadline?: string) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviewer Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your proposal review assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAssignments()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <Link
            href="/reviewer/matrix"
            className="btn-secondary flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Committee Matrix
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label="Assigned"
          value={stats.assigned}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending}
          color="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={stats.completed}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={AlertCircle}
          label="Overdue"
          value={stats.overdue}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Review Time</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.avgReviewTime > 0 ? `${Math.round(stats.avgReviewTime)} days` : "N/A"}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg">
              <FileText className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Reviews</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalReviews}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Score Given</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.avgScoreGiven > 0 ? `${stats.avgScoreGiven.toFixed(1)}/100` : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "dashboard"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ClipboardList className="inline-block h-4 w-4 mr-2" />
            My Assignments
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "matrix"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <BarChart3 className="inline-block h-4 w-4 mr-2" />
            Committee Matrix
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "history"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Clock className="inline-block h-4 w-4 mr-2" />
            Review History
          </button>
        </nav>
      </div>

      {/* Assignments List */}
      {activeTab === "dashboard" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">Filter:</span>
              {["all", "pending", "completed", "overdue"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as typeof filter)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    filter === f
                      ? "bg-primary-100 text-primary-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button className="btn-secondary flex items-center gap-2 text-sm">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          {/* Assignments Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Application
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No assignments found
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((assignment) => {
                      const daysRemaining = getDaysRemaining(assignment.deadline);
                      const isOverdue = daysRemaining !== null && daysRemaining < 0;
                      return (
                        <tr key={assignment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {assignment.application.applicationNumber}
                              </p>
                              <p className="text-xs text-gray-500">{assignment.application.name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900 max-w-xs truncate">
                              {assignment.application.researchProposal?.projectTitle || "N/A"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {assignment.application.researchProposal?.researchArea || ""}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                assignment.status
                              )}`}
                            >
                              {assignment.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {assignment.deadline ? (
                              <div className="flex items-center gap-2">
                                <Calendar className={`h-4 w-4 ${isOverdue ? "text-red-500" : "text-gray-400"}`} />
                                <span
                                  className={`text-sm ${
                                    isOverdue ? "text-red-600 font-medium" : "text-gray-600"
                                  }`}
                                >
                                  {isOverdue
                                    ? `${Math.abs(daysRemaining)} days overdue`
                                    : `${daysRemaining} days left`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No deadline</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {assignment.review?.totalScore !== undefined ? (
                              <span className="text-sm font-medium text-gray-900">
                                {assignment.review.totalScore.toFixed(1)}/100
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/reviewer/application/${assignment.applicationId}`}
                              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                            >
                              <Eye className="h-4 w-4" />
                              {assignment.status === "SUBMITTED" ? "View" : "Review"}
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Committee Matrix Tab */}
      {activeTab === "matrix" && (
        <div className="card">
          <div className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Committee Score Matrix
            </h3>
            <p className="text-gray-500 mb-4">
              View side-by-side comparison of reviewer scores
            </p>
            <Link
              href="/reviewer/matrix"
              className="btn-primary"
            >
              Open Committee Matrix
            </Link>
          </div>
        </div>
      )}

      {/* Review History Tab */}
      {activeTab === "history" && (
        <div className="card">
          <div className="p-8 text-center">
            <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Review History
            </h3>
            <p className="text-gray-500 mb-4">
              View your completed reviews and feedback
            </p>
            <button className="btn-secondary">
              View All Reviews
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
