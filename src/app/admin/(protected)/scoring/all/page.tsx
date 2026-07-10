"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Loader2,
  Users,
  Award,
  Lock,
  Unlock,
  Eye,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

interface Criteria {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

interface ScoreCriteria {
  criteriaId: string;
  criteriaName: string;
  criteriaDescription: string;
  maxScore: number;
  score: number;
}

interface Score {
  id: string;
  reviewerId: string;
  reviewerName: string;
  isSubmitted: boolean;
  isLocked: boolean;
  lockedAt: string | null;
  totalScore: number;
  maxPossibleScore: number;
  remarks: string | null;
  criteria: ScoreCriteria[];
}

interface Application {
  id: string;
  applicationNumber: string;
  name: string;
  email: string;
  status: string;
  submittedAt: string | null;
  projectTitle: string;
  
  legacyScores: Array<{
    reviewerName: string;
    scientificMerit: number;
    innovation: number;
    feasibility: number;
    budgetJustification: number;
    viddhakarmaRelevance: number;
    totalScore: number;
    isSubmitted: boolean;
    isShortlisted: boolean;
  }>;
  
  legacyAvgScore: number | null;
  legacySubmittedCount: number;
  
  scores: Score[];
  newAvgScore: number | null;
  newSubmittedCount: number;
  newLockedCount: number;
  
  maxPossibleScore: number;
  totalReviewers: number;
  criteriaCount: number;
  criteriaAverages: Array<{
    criteriaId: string;
    criteriaName: string;
    criteriaDescription: string;
    maxScore: number;
    averageScore: number | null;
    scoreCount: number;
  }>;
}

interface Summary {
  totalApplications: number;
  scoredApplications: number;
  fullyScoredApplications: number;
  averageScore: number | null;
}

export default function AdminScoringAllPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Expanded row
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  
  // Detail view
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  async function fetchData() {
    setLoading(true);
    setError("");
    
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      
      const res = await fetch(`/api/admin/scoring/all?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch data");
      }
      
      setApplications(data.applications);
      setCriteria(data.criteria);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
    
    setLoading(false);
  }

  function getFilteredApplications() {
    return applications.filter(app => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          app.name.toLowerCase().includes(query) ||
          app.applicationNumber.toLowerCase().includes(query) ||
          app.email.toLowerCase().includes(query) ||
          app.projectTitle.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function openDetailModal(app: Application) {
    setSelectedApp(app);
    setShowDetailModal(true);
  }

  const filteredApps = getFilteredApplications();

  if (loading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scoring Dashboard</h1>
          <p className="mt-1 text-gray-600">
            View all application scores with individual criteria breakdown
          </p>
        </div>
        <Button variant="secondary" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Applications</p>
                <p className="text-2xl font-bold">{summary.totalApplications}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Scored Applications</p>
                <p className="text-2xl font-bold">{summary.scoredApplications}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-3">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Fully Scored</p>
                <p className="text-2xl font-bold">{summary.fullyScoredApplications}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-3">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Score</p>
                <p className="text-2xl font-bold">
                  {summary.averageScore !== null 
                    ? `${summary.averageScore.toFixed(1)}%` 
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search by name, email, app number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All Statuses" },
            { value: "UNDER_REVIEW", label: "Under Review" },
            { value: "TECHNICAL_SCORING", label: "Technical Scoring" },
            { value: "SHORTLISTED", label: "Shortlisted" },
            { value: "WAITLISTED", label: "Waitlisted" },
          ]}
        />
      </div>

      {/* Criteria Headers Info */}
      {criteria.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Scoring Criteria</h3>
          <div className="flex flex-wrap gap-2">
            {criteria.map((c) => (
              <span key={c.id} className="badge bg-gray-100 text-gray-700">
                {c.description}: {c.maxScore} pts
              </span>
            ))}
            <span className="badge bg-primary-100 text-primary-700">
              Total: {criteria.reduce((sum, c) => sum + c.maxScore, 0)} pts
            </span>
          </div>
        </div>
      )}

      {/* Applications Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Applicant</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-center">Reviewers</th>
                <th className="px-4 py-3 font-medium text-center">Submitted</th>
                <th className="px-4 py-3 font-medium text-center">Locked</th>
                <th className="px-4 py-3 font-medium text-right">Avg Score</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No applications found
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <>
                    <tr key={app.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{app.name}</p>
                          <p className="text-xs text-gray-500">{app.applicationNumber}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{app.projectTitle}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {app.totalReviewers}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={app.newSubmittedCount > 0 ? "text-green-600 font-medium" : ""}>
                          {app.newSubmittedCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {app.newLockedCount > 0 ? (
                          <Lock className="h-4 w-4 text-orange-600 mx-auto" />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {app.newAvgScore !== null ? (
                          <span className="font-semibold">
                            {app.newAvgScore.toFixed(1)}%
                          </span>
                        ) : app.legacyAvgScore !== null ? (
                          <span className="text-gray-500 text-xs">
                            (Legacy: {app.legacyAvgScore.toFixed(0)})
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="secondary"
                            className="text-xs"
                            onClick={() => openDetailModal(app)}
                          >
                            <Eye className="h-3 w-3" />
                            Details
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-xs"
                            onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                          >
                            {expandedApp === app.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedApp === app.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-4">
                            <h4 className="font-semibold">Individual Criteria Scores</h4>
                            
                            {app.scores.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b bg-white">
                                      <th className="px-2 py-2 text-left font-medium">Reviewer</th>
                                      {criteria.map((c) => (
                                        <th key={c.id} className="px-2 py-2 text-center font-medium">
                                          {c.description.substring(0, 8)}...
                                        </th>
                                      ))}
                                      <th className="px-2 py-2 text-center font-medium">Total</th>
                                      <th className="px-2 py-2 text-center font-medium">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {app.scores.map((score) => (
                                      <tr key={score.id} className="border-b bg-white">
                                        <td className="px-2 py-2">
                                          <div>
                                            <p className="font-medium">{score.reviewerName}</p>
                                            {score.isLocked && <Lock className="h-3 w-3 text-orange-500" />}
                                          </div>
                                        </td>
                                        {criteria.map((c) => {
                                          const criteriaScore = score.criteria.find(cr => cr.criteriaId === c.id);
                                          return (
                                            <td key={c.id} className="px-2 py-2 text-center">
                                              {criteriaScore ? (
                                                <span className={criteriaScore.score > 0 ? "text-green-600" : "text-gray-400"}>
                                                  {criteriaScore.score}/{criteriaScore.maxScore}
                                                </span>
                                              ) : (
                                                "-"
                                              )}
                                            </td>
                                          );
                                        })}
                                        <td className="px-2 py-2 text-center font-semibold">
                                          {score.totalScore}/{score.maxPossibleScore}
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                          {score.isSubmitted ? (
                                            <span className="badge bg-green-100 text-green-700">Submitted</span>
                                          ) : (
                                            <span className="badge bg-gray-100 text-gray-600">Draft</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : app.legacyScores.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b bg-white">
                                      <th className="px-2 py-2 text-left font-medium">Reviewer</th>
                                      <th className="px-2 py-2 text-center font-medium">Scientific</th>
                                      <th className="px-2 py-2 text-center font-medium">Innovation</th>
                                      <th className="px-2 py-2 text-center font-medium">Feasibility</th>
                                      <th className="px-2 py-2 text-center font-medium">Budget</th>
                                      <th className="px-2 py-2 text-center font-medium">Relevance</th>
                                      <th className="px-2 py-2 text-center font-medium">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {app.legacyScores.map((score, idx) => (
                                      <tr key={idx} className="border-b bg-white">
                                        <td className="px-2 py-2 font-medium">{score.reviewerName}</td>
                                        <td className="px-2 py-2 text-center">{score.scientificMerit}</td>
                                        <td className="px-2 py-2 text-center">{score.innovation}</td>
                                        <td className="px-2 py-2 text-center">{score.feasibility}</td>
                                        <td className="px-2 py-2 text-center">{score.budgetJustification}</td>
                                        <td className="px-2 py-2 text-center">{score.viddhakarmaRelevance}</td>
                                        <td className="px-2 py-2 text-center font-semibold">{score.totalScore}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No scores yet</p>
                            )}

                            {/* Criteria Averages */}
                            {app.criteriaAverages.length > 0 && (
                              <div className="mt-4">
                                <h5 className="font-medium mb-2">Average Score by Criteria</h5>
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                  {app.criteriaAverages.map((avg) => (
                                    <div key={avg.criteriaId} className="bg-white rounded-lg p-3 border">
                                      <p className="text-xs text-gray-500">{avg.criteriaName}</p>
                                      <p className="text-lg font-semibold">
                                        {avg.averageScore !== null 
                                          ? `${avg.averageScore.toFixed(1)}/${avg.maxScore}`
                                          : "N/A"}
                                      </p>
                                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                        <div 
                                          className="bg-primary-600 h-2 rounded-full"
                                          style={{ 
                                            width: avg.averageScore !== null 
                                              ? `${(avg.averageScore / avg.maxScore) * 100}%` 
                                              : "0%" 
                                          }}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Score Details: {selectedApp.name}</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <p><strong>Application:</strong> {selectedApp.applicationNumber}</p>
              <p><strong>Project:</strong> {selectedApp.projectTitle || "N/A"}</p>
              <p><strong>Status:</strong> <StatusBadge status={selectedApp.status} /></p>
              <p><strong>Average Score:</strong> {selectedApp.newAvgScore !== null ? `${selectedApp.newAvgScore.toFixed(1)}%` : "N/A"}</p>
            </div>

            {/* Criteria Averages */}
            {selectedApp.criteriaAverages.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Score Analysis by Criteria
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedApp.criteriaAverages.map((avg) => (
                    <div key={avg.criteriaId} className="rounded-lg border p-3">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-medium">{avg.criteriaName}</p>
                        <p className="text-sm text-gray-500">Max: {avg.maxScore}</p>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-600">Average</p>
                        <p className="font-semibold">
                          {avg.averageScore !== null ? avg.averageScore.toFixed(2) : "N/A"}
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ 
                            width: avg.averageScore !== null 
                              ? `${Math.min(100, (avg.averageScore / avg.maxScore) * 100)}%` 
                              : "0%" 
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{avg.scoreCount} reviewers scored this</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Reviewer Scores */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Individual Reviewer Scores
              </h3>
              
              {selectedApp.scores.length > 0 ? (
                <div className="space-y-4">
                  {selectedApp.scores.map((score) => (
                    <div key={score.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{score.reviewerName}</p>
                          {score.isLocked && <Lock className="h-4 w-4 text-orange-500" />}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{score.totalScore}/{score.maxPossibleScore}</p>
                          <p className="text-xs text-gray-500">
                            {((score.totalScore / score.maxPossibleScore) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {score.criteria.map((c) => (
                          <div key={c.criteriaId} className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-500">{c.criteriaName}</p>
                            <p className="font-semibold">{c.score}/{c.maxScore}</p>
                          </div>
                        ))}
                      </div>
                      
                      {score.remarks && (
                        <div className="mt-3 rounded bg-yellow-50 p-2 text-sm">
                          <p className="font-medium text-yellow-800">Remarks:</p>
                          <p className="text-yellow-700">{score.remarks}</p>
                        </div>
                      )}
                      
                      <div className="mt-2 flex items-center gap-2">
                        {score.isSubmitted ? (
                          <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Submitted
                          </span>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Draft
                          </span>
                        )}
                        {score.isLocked && (
                          <span className="badge bg-orange-100 text-orange-700 flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedApp.legacyScores.length > 0 ? (
                <div className="space-y-4">
                  {selectedApp.legacyScores.map((score, idx) => (
                    <div key={idx} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold">{score.reviewerName}</p>
                        <div className="text-right">
                          <p className="text-xl font-bold">{score.totalScore}/100</p>
                        </div>
                      </div>
                      
                      <div className="grid gap-2 sm:grid-cols-5">
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-500">Scientific</p>
                          <p className="font-semibold">{score.scientificMerit}/25</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-500">Innovation</p>
                          <p className="font-semibold">{score.innovation}/20</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-500">Feasibility</p>
                          <p className="font-semibold">{score.feasibility}/20</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-500">Budget</p>
                          <p className="font-semibold">{score.budgetJustification}/20</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-500">Relevance</p>
                          <p className="font-semibold">{score.viddhakarmaRelevance}/15</p>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center gap-2">
                        {score.isSubmitted ? (
                          <span className="badge bg-green-100 text-green-700">Submitted</span>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-600">Draft</span>
                        )}
                        {score.isShortlisted && (
                          <span className="badge bg-blue-100 text-blue-700">Shortlisted</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No scores yet</p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
