"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Users,
  MessageSquare,
  Calendar,
  Download,
  RefreshCw,
  Eye,
} from "lucide-react";
import { REVIEW_QUESTIONNAIRE, SECTION_WEIGHTS } from "@/lib/review-questionnaire";

interface CommitteeMatrixProps {
  applicationId?: string;
}

interface MatrixApplication {
  id: string;
  applicationNumber: string;
  applicantName: string;
  projectTitle: string;
  matrix?: {
    id: string;
    finalDecision?: string;
    finalScore?: number;
    finalBudget?: number;
    interviewRequired: boolean;
    committeeRemarks?: string;
  };
  reviews: {
    reviewerId: string;
    reviewerName: string;
    sectionScores: Record<string, { score: number; maxScore: number; weighted: number }>;
    totalScore: number;
    recommendation?: string;
    interviewRecommendation?: string;
    budgetRecommended?: number;
    varianceLevel?: string;
    submittedAt: string;
  }[];
}

export function CommitteeMatrix({ applicationId }: CommitteeMatrixProps) {
  const [applications, setApplications] = useState<MatrixApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<string | null>(applicationId || null);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [decisionModal, setDecisionModal] = useState(false);
  const [decision, setDecision] = useState({
    finalDecision: "",
    finalScore: 0,
    finalBudget: 0,
    interviewRequired: false,
    committeeRemarks: "",
  });

  useEffect(() => {
    fetchMatrixData();
  }, []);

  const fetchMatrixData = async () => {
    try {
      const res = await fetch(
        `/api/committee/matrix${applicationId ? `?applicationId=${applicationId}` : ""}`
      );
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
        if (!selectedApp && data.length > 0) {
          setSelectedApp(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching matrix data:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedApplication = applications.find((a) => a.id === selectedApp);

  const toggleReview = (reviewerId: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewerId)) {
      newExpanded.delete(reviewerId);
    } else {
      newExpanded.add(reviewerId);
    }
    setExpandedReviews(newExpanded);
  };

  const calculateVariance = (reviews: MatrixApplication["reviews"]) => {
    if (reviews.length < 2) return null;
    const scores = reviews.map((r) => r.totalScore);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = Math.sqrt(
      scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length
    );
    if (variance < 5) return { level: "LOW", color: "text-green-600 bg-green-50" };
    if (variance < 15) return { level: "MODERATE", color: "text-yellow-600 bg-yellow-50" };
    return { level: "HIGH", color: "text-red-600 bg-red-50" };
  };

  const getRecommendationColor = (rec?: string) => {
    switch (rec) {
      case "APPROVE":
        return "bg-green-100 text-green-800";
      case "APPROVE_WITH_MINOR_REVISION":
        return "bg-lime-100 text-lime-800";
      case "MAJOR_REVISION":
        return "bg-yellow-100 text-yellow-800";
      case "REJECT":
        return "bg-red-100 text-red-800";
      case "INTERVIEW_REQUIRED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const saveDecision = async () => {
    if (!selectedApp) return;
    try {
      const res = await fetch(`/api/committee/matrix/${selectedApp}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(decision),
      });
      if (res.ok) {
        setDecisionModal(false);
        fetchMatrixData();
      }
    } catch (error) {
      console.error("Error saving decision:", error);
    }
  };

  const exportMatrix = () => {
    if (!selectedApplication) return;
    // Create CSV
    const headers = [
      "Application Number",
      "Applicant",
      "Project Title",
      ...selectedApplication.reviews.map((r) => `${r.reviewerName} Score`),
      "Average Score",
      "Final Score",
      "Recommendation",
    ];
    const row = [
      selectedApplication.applicationNumber,
      selectedApplication.applicantName,
      selectedApplication.projectTitle,
      ...selectedApplication.reviews.map((r) => r.totalScore.toFixed(1)),
      (
        selectedApplication.reviews.reduce((sum, r) => sum + r.totalScore, 0) /
        selectedApplication.reviews.length
      ).toFixed(1),
      selectedApplication.matrix?.finalScore?.toFixed(1) || "Pending",
      selectedApplication.matrix?.finalDecision || "Pending",
    ];
    const csv = [headers.join(","), row.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `committee-matrix-${selectedApplication.applicationNumber}.csv`;
    a.click();
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
          <h1 className="text-2xl font-bold text-gray-900">Committee Matrix</h1>
          <p className="mt-1 text-sm text-gray-500">
            Side-by-side comparison of reviewer scores and recommendations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMatrixData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={exportMatrix}
            disabled={!selectedApplication}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Application Selector */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Application
        </label>
        <select
          value={selectedApp || ""}
          onChange={(e) => setSelectedApp(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {applications.map((app) => (
            <option key={app.id} value={app.id}>
              {app.applicationNumber} - {app.applicantName} ({app.reviews.length} reviews)
            </option>
          ))}
        </select>
      </div>

      {selectedApplication && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Score</p>
                  <p className="text-xl font-bold text-gray-900">
                    {(
                      selectedApplication.reviews.reduce((sum, r) => sum + r.totalScore, 0) /
                      selectedApplication.reviews.length
                    ).toFixed(1)}
                    /100
                  </p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reviewers</p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedApplication.reviews.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Variance</p>
                  <p className={`text-xl font-bold ${calculateVariance(selectedApplication.reviews)?.color || "text-gray-900"}`}>
                    {calculateVariance(selectedApplication.reviews)?.level || "N/A"}
                  </p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedApplication.matrix?.finalDecision === "APPROVED"
                    ? "bg-green-50"
                    : selectedApplication.matrix?.finalDecision === "REJECTED"
                    ? "bg-red-50"
                    : "bg-gray-50"
                }`}>
                  {selectedApplication.matrix?.finalDecision === "APPROVED" ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : selectedApplication.matrix?.finalDecision === "REJECTED" ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <BarChart3 className="h-5 w-5 text-gray-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Decision</p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedApplication.matrix?.finalDecision || "Pending"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Score Comparison Table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Score Comparison Matrix</h3>
              <p className="text-sm text-gray-500">
                {selectedApplication.applicantName} - {selectedApplication.projectTitle}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Criterion
                    </th>
                    {selectedApplication.reviews.map((review) => (
                      <th
                        key={review.reviewerId}
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{review.reviewerName}</p>
                          <p className="text-xs text-gray-400 font-normal">
                            {new Date(review.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                      Committee
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {REVIEW_QUESTIONNAIRE.filter((s) => s.weight > 0).map((section) => {
                    const avgSectionScore =
                      selectedApplication.reviews.reduce((sum, r) => {
                        const sectionScore = r.sectionScores[section.type];
                        return sum + (sectionScore?.score || 0);
                      }, 0) / selectedApplication.reviews.length;

                    return (
                      <tr key={section.id}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{section.name}</p>
                            <p className="text-xs text-gray-500">Weight: {section.weight}%</p>
                          </div>
                        </td>
                        {selectedApplication.reviews.map((review) => {
                          const sectionScore = review.sectionScores[section.type];
                          return (
                            <td key={review.reviewerId} className="px-4 py-3 text-center">
                              <span className="text-sm font-medium">
                                {sectionScore ? `${sectionScore.score.toFixed(1)}/${sectionScore.maxScore}` : "—"}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center bg-gray-50">
                          <span className="text-sm font-bold text-primary-600">
                            {avgSectionScore.toFixed(1)}/100
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total Score Row */}
                  <tr className="font-bold bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-gray-900">Total Score</span>
                    </td>
                    {selectedApplication.reviews.map((review) => (
                      <td key={review.reviewerId} className="px-4 py-3 text-center">
                        <span className="text-lg text-gray-900">{review.totalScore.toFixed(1)}</span>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center bg-primary-50">
                      <span className="text-lg text-primary-700">
                        {selectedApplication.matrix?.finalScore?.toFixed(1) || "—"}
                      </span>
                    </td>
                  </tr>
                  {/* Recommendation Row */}
                  <tr>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">Recommendation</span>
                    </td>
                    {selectedApplication.reviews.map((review) => (
                      <td key={review.reviewerId} className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRecommendationColor(
                            review.recommendation
                          )}`}
                        >
                          {review.recommendation?.replace(/_/g, " ") || "—"}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center bg-gray-50">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRecommendationColor(
                          selectedApplication.matrix?.finalDecision
                        )}`}
                      >
                        {selectedApplication.matrix?.finalDecision?.replace(/_/g, " ") || "Pending"}
                      </span>
                    </td>
                  </tr>
                  {/* Interview Row */}
                  <tr>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">Interview</span>
                    </td>
                    {selectedApplication.reviews.map((review) => (
                      <td key={review.reviewerId} className="px-4 py-3 text-center">
                        {review.interviewRecommendation ? (
                          <span className="text-sm">
                            {review.interviewRecommendation.replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center bg-gray-50">
                      {selectedApplication.matrix?.interviewRequired ? (
                        <CheckCircle className="h-5 w-5 text-amber-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                  {/* Budget Row */}
                  <tr>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">Budget</span>
                    </td>
                    {selectedApplication.reviews.map((review) => (
                      <td key={review.reviewerId} className="px-4 py-3 text-center">
                        {review.budgetRecommended ? (
                          <span className="text-sm">
                            ₹{review.budgetRecommended.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center bg-gray-50">
                      {selectedApplication.matrix?.finalBudget ? (
                        <span className="text-sm font-medium">
                          ₹{selectedApplication.matrix.finalBudget.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual Reviews */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Individual Reviewer Assessments</h3>
            {selectedApplication.reviews.map((review) => (
              <div key={review.reviewerId} className="card">
                <button
                  onClick={() => toggleReview(review.reviewerId)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{review.reviewerName}</p>
                      <p className="text-sm text-gray-500">
                        Score: {review.totalScore.toFixed(1)}/100 •{" "}
                        <span className={getRecommendationColor(review.recommendation).split(" ")[1]}>
                          {review.recommendation?.replace(/_/g, " ")}
                        </span>
                      </p>
                    </div>
                  </div>
                  {expandedReviews.has(review.reviewerId) ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {expandedReviews.has(review.reviewerId) && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-gray-500">Section Scores</p>
                        <div className="mt-2 space-y-1">
                          {Object.entries(review.sectionScores).map(([type, scores]) => {
                            const section = REVIEW_QUESTIONNAIRE.find((s) => s.type === type);
                            return (
                              <div key={type} className="flex justify-between text-sm">
                                <span className="text-gray-600">{section?.name || type}</span>
                                <span className="font-medium">
                                  {scores.score.toFixed(1)}/{scores.maxScore}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Recommendations</p>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Final:</span>
                            <span
                              className={`px-2 py-0.5 text-xs rounded ${getRecommendationColor(
                                review.recommendation
                              )}`}
                            >
                              {review.recommendation?.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Interview:</span>
                            <span className="text-sm">
                              {review.interviewRecommendation?.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Variance:</span>
                            <span
                              className={`px-2 py-0.5 text-xs rounded ${
                                review.varianceLevel === "LOW"
                                  ? "bg-green-100 text-green-700"
                                  : review.varianceLevel === "MODERATE"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {review.varianceLevel}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Budget</p>
                        <p className="mt-2 text-lg font-medium">
                          ₹{review.budgetRecommended?.toLocaleString() || "Not reviewed"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Make Decision */}
          <div className="card bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Committee Decision</h3>
                <p className="text-sm text-gray-500">
                  {selectedApplication.matrix?.finalDecision
                    ? `Current: ${selectedApplication.matrix.finalDecision.replace(/_/g, " ")}`
                    : "No decision made yet"}
                </p>
              </div>
              <button
                onClick={() => {
                  setDecision({
                    finalDecision: selectedApplication.matrix?.finalDecision || "",
                    finalScore: selectedApplication.matrix?.finalScore || 0,
                    finalBudget: selectedApplication.matrix?.finalBudget || 0,
                    interviewRequired: selectedApplication.matrix?.interviewRequired || false,
                    committeeRemarks: selectedApplication.matrix?.committeeRemarks || "",
                  });
                  setDecisionModal(true);
                }}
                className="btn-primary"
              >
                Make Decision
              </button>
            </div>
          </div>
        </>
      )}

      {/* Decision Modal */}
      {decisionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Committee Decision</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Final Decision
                </label>
                <select
                  value={decision.finalDecision}
                  onChange={(e) => setDecision({ ...decision, finalDecision: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select decision...</option>
                  <option value="APPROVED">Approve</option>
                  <option value="APPROVED_WITH_CONDITIONS">Approve with Conditions</option>
                  <option value="WAITLISTED">Waitlist</option>
                  <option value="REJECTED">Reject</option>
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Final Score
                  </label>
                  <input
                    type="number"
                    value={decision.finalScore}
                    onChange={(e) =>
                      setDecision({ ...decision, finalScore: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Final Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={decision.finalBudget}
                    onChange={(e) =>
                      setDecision({ ...decision, finalBudget: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="interviewRequired"
                  checked={decision.interviewRequired}
                  onChange={(e) =>
                    setDecision({ ...decision, interviewRequired: e.target.checked })
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="interviewRequired" className="text-sm text-gray-700">
                  Interview Required
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Committee Remarks
                </label>
                <textarea
                  value={decision.committeeRemarks}
                  onChange={(e) =>
                    setDecision({ ...decision, committeeRemarks: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter committee remarks..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDecisionModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveDecision}
                className="flex-1 btn-primary"
              >
                Save Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
