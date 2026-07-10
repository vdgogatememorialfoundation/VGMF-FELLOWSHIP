"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Loader2,
  CheckCircle2,
  Lock,
  Unlock,
  Save,
  Send,
  Eye,
  FileText,
  X,
  AlertTriangle,
} from "lucide-react";

interface Criteria {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

interface SavedScore {
  criteriaId: string;
  criteriaName: string;
  criteriaDescription: string;
  maxScore: number;
  score: number;
}

interface ApplicationScore {
  id: string;
  isSubmitted: boolean;
  isLocked: boolean;
  totalScore: number;
  maxPossibleScore: number;
  remarks: string | null;
  scores: SavedScore[];
}

interface Application {
  id: string;
  applicationNumber: string;
  name: string;
  email: string;
  status: string;
  submittedAt: string | null;
  projectTitle: string;
  researchArea: string;
  myScore: ApplicationScore | null;
  maxPossibleScore: number;
}

export default function ReviewerScoresPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  
  // Scoring form state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAppModal, setShowAppModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/reviewer/scores");
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch data");
      }
      
      setApplications(data.applications);
      setCriteria(data.criteria);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
    
    setLoading(false);
  }

  function openApplicationDetails(app: Application) {
    setSelectedApp(app);
    setShowAppModal(true);
  }

  function openScoreForm(app: Application) {
    setSelectedApp(app);
    
    // Initialize scores from existing or set to 0
    const newScores = new Map<string, number>();
    if (app.myScore) {
      app.myScore.scores.forEach(s => {
        newScores.set(s.criteriaId, s.score);
      });
      setRemarks(app.myScore.remarks || "");
    } else {
      criteria.forEach(c => {
        newScores.set(c.id, 0);
      });
      setRemarks("");
    }
    setScores(newScores);
    setShowScoreModal(true);
  }

  function updateScore(criteriaId: string, value: number) {
    const newScores = new Map(scores);
    newScores.set(criteriaId, value);
    setScores(newScores);
  }

  function getTotalScore(): number {
    let total = 0;
    scores.forEach(score => {
      total += score;
    });
    return total;
  }

  function getTotalMaxScore(): number {
    return criteria.reduce((sum, c) => sum + c.maxScore, 0);
  }

  async function saveScore(submitAndLock: boolean) {
    if (!selectedApp) return;

    if (submitAndLock) {
      // Validate all scores are filled
      let allFilled = true;
      scores.forEach((score) => {
        if (score <= 0) allFilled = false;
      });
      
      if (!allFilled) {
        alert("Please fill in all scores before submitting.");
        return;
      }
    }

    const isSubmitting = submitAndLock;
    if (isSubmitting) setSubmitting(true);
    else setSaving(true);
    setError("");

    try {
      const scoreData = criteria.map(c => ({
        criteriaId: c.id,
        score: scores.get(c.id) || 0,
      }));

      const res = await fetch("/api/reviewer/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedApp.id,
          scores: scoreData,
          remarks,
          submit: submitAndLock,
          lock: submitAndLock,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save score");
      }

      setSuccessMessage(
        submitAndLock 
          ? "Score submitted and locked successfully!" 
          : "Score saved successfully!"
      );
      
      setShowScoreModal(false);
      fetchData();
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save score");
    }

    setSaving(false);
    setSubmitting(false);
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const scoredApps = applications.filter(a => a.myScore?.isSubmitted);
  const draftApps = applications.filter(a => a.myScore && !a.myScore.isSubmitted);
  const unscoredApps = applications.filter(a => !a.myScore);

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
          <h1 className="text-2xl font-bold text-gray-900">My Reviewer Scores</h1>
          <p className="mt-1 text-gray-600">
            Score and evaluate applications
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-lg bg-green-50 p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Scoring Criteria */}
      {criteria.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Scoring Criteria</h3>
          <div className="flex flex-wrap gap-2">
            {criteria.map((c) => (
              <div key={c.id} className="rounded-lg bg-gray-50 px-3 py-1">
                <span className="font-medium">{c.description}</span>
                <span className="ml-1 text-sm text-gray-500">({c.maxScore} pts)</span>
              </div>
            ))}
            <div className="rounded-lg bg-primary-50 px-3 py-1">
              <span className="font-semibold text-primary-700">Total: {getTotalMaxScore()} pts</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold">{scoredApps.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-100 p-3">
              <Lock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold">{draftApps.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gray-100 p-3">
              <FileText className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Not Started</p>
              <p className="text-2xl font-bold">{unscoredApps.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="card overflow-hidden">
        <div className="border-b bg-gray-50 px-4 py-3">
          <h3 className="font-semibold">Applications to Review</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Application</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-center">My Score</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    No applications assigned to you for review
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{app.name}</p>
                        <p className="text-xs text-gray-500">{app.applicationNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <p className="truncate text-sm">{app.projectTitle || "N/A"}</p>
                        <p className="text-xs text-gray-500">{app.researchArea}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {app.myScore ? (
                        <div>
                          <span className={`font-semibold ${app.myScore.isSubmitted ? "text-green-600" : "text-yellow-600"}`}>
                            {app.myScore.totalScore}/{app.myScore.maxPossibleScore}
                          </span>
                          {app.myScore.isLocked && (
                            <Lock className="ml-1 inline h-3 w-3 text-orange-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Not started</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="secondary"
                          className="text-xs"
                          onClick={() => openApplicationDetails(app)}
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                        <Button
                          className="text-xs"
                          onClick={() => openScoreForm(app)}
                          disabled={app.myScore?.isLocked}
                        >
                          {app.myScore ? "Edit" : "Score"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Details Modal */}
      {showAppModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Application Details</h2>
              <button onClick={() => setShowAppModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Applicant Name</p>
                  <p className="font-medium">{selectedApp.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Application Number</p>
                  <p className="font-medium">{selectedApp.applicationNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedApp.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Submitted</p>
                  <p className="font-medium">{formatDate(selectedApp.submittedAt)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Project Title</p>
                <p className="font-medium">{selectedApp.projectTitle || "N/A"}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Research Area</p>
                <p className="font-medium">{selectedApp.researchArea || "N/A"}</p>
              </div>

              {selectedApp.myScore && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <h4 className="font-semibold mb-2">My Scores</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedApp.myScore.scores.map((s) => (
                      <div key={s.criteriaId} className="flex justify-between">
                        <span className="text-sm">{s.criteriaName}</span>
                        <span className="font-medium">{s.score}/{s.maxScore}</span>
                      </div>
                    ))}
                    <div className="col-span-2 border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>{selectedApp.myScore.totalScore}/{selectedApp.myScore.maxPossibleScore}</span>
                      </div>
                    </div>
                  </div>
                  {selectedApp.myScore.remarks && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-500">Remarks</p>
                      <p className="text-sm">{selectedApp.myScore.remarks}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowAppModal(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowAppModal(false);
                  openScoreForm(selectedApp);
                }}
                disabled={selectedApp.myScore?.isLocked}
              >
                {selectedApp.myScore ? "Edit Score" : "Start Scoring"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Score Form Modal */}
      {showScoreModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Score: {selectedApp.name}
              </h2>
              <button onClick={() => setShowScoreModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            {selectedApp.myScore?.isLocked && (
              <div className="mb-4 rounded-lg bg-orange-50 p-3">
                <div className="flex items-center gap-2 text-orange-800">
                  <Lock className="h-5 w-5" />
                  <span className="font-medium">This score is locked and cannot be edited.</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {criteria.map((c) => (
                <div key={c.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold">{c.description}</p>
                      <p className="text-xs text-gray-500">{c.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{scores.get(c.id) || 0}</p>
                      <p className="text-xs text-gray-500">/ {c.maxScore}</p>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={c.maxScore}
                    step="0.5"
                    value={scores.get(c.id) || 0}
                    onChange={(e) => updateScore(c.id, parseFloat(e.target.value))}
                    disabled={selectedApp.myScore?.isLocked}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0</span>
                    <span>{c.maxScore}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Score */}
            <div className="my-4 rounded-lg bg-primary-50 p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Score</span>
                <span className="text-3xl font-bold text-primary-700">
                  {getTotalScore()} / {getTotalMaxScore()}
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${(getTotalScore() / getTotalMaxScore()) * 100}%` }}
                />
              </div>
              <p className="text-sm text-primary-600 mt-1">
                {((getTotalScore() / getTotalMaxScore()) * 100).toFixed(1)}%
              </p>
            </div>

            {/* Remarks */}
            <div className="mb-4">
              <Textarea
                label="Remarks / Feedback"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter your remarks and feedback for this application..."
                rows={4}
                disabled={selectedApp.myScore?.isLocked}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button 
                variant="secondary" 
                onClick={() => setShowScoreModal(false)}
              >
                Cancel
              </Button>
              {!selectedApp.myScore?.isLocked && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => saveScore(false)}
                    loading={saving}
                    disabled={submitting}
                  >
                    <Save className="h-4 w-4" />
                    Save Draft
                  </Button>
                  <Button
                    onClick={() => saveScore(true)}
                    loading={submitting}
                    disabled={saving}
                  >
                    <Send className="h-4 w-4" />
                    Submit & Lock
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
