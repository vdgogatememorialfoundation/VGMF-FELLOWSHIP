"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  StickyNote,
  Highlight,
  Underline,
  Clock,
  Save,
  Send,
  FileText,
  User,
  Calendar,
  DollarSign,
  Eye,
  BarChart3,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import { REVIEW_QUESTIONNAIRE, SECTION_WEIGHTS, calculateWeightedScore } from "@/lib/review-questionnaire";

interface ProposalReviewWorkspaceProps {
  applicationId: string;
  application: any;
  onComplete?: () => void;
}

interface ReviewResponse {
  questionId: string;
  score?: number;
  booleanValue?: boolean;
  textValue?: string;
  selectedOptions?: string[];
  confidenceLevel?: number;
  tableData?: any;
}

export function ProposalReviewWorkspace({
  applicationId,
  application,
  onComplete,
}: ProposalReviewWorkspaceProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, ReviewResponse>>({});
  const [conflictDeclared, setConflictDeclared] = useState<boolean | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [activeTab, setActiveTab] = useState<"proposal" | "review">("review");
  const [scoreCalculation, setScoreCalculation] = useState<{
    sectionScores: Record<string, number>;
    totalScore: number;
    maxScore: number;
  } | null>(null);

  const currentSection = REVIEW_QUESTIONNAIRE[currentSectionIndex];
  const totalSections = REVIEW_QUESTIONNAIRE.length;

  useEffect(() => {
    if (conflictDeclared === false) {
      setConflictModalOpen(false);
    }
  }, [conflictDeclared]);

  useEffect(() => {
    // Calculate weighted score
    const calc = calculateWeightedScore(responses);
    setScoreCalculation(calc);
  }, [responses]);

  const handleResponseChange = (questionId: string, response: Partial<ReviewResponse>) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        ...response,
      },
    }));
  };

  const saveReview = async (asDraft = true) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/reviewer/reviews/${applicationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses,
          isDraft: asDraft,
          conflictDeclared,
        }),
      });
      if (res.ok) {
        console.log("Review saved successfully");
      }
    } catch (error) {
      console.error("Error saving review:", error);
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async () => {
    if (!confirm("Are you sure you want to submit your review? This cannot be undone.")) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviewer/reviews/${applicationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses,
          isDraft: false,
          conflictDeclared,
        }),
      });
      if (res.ok) {
        onComplete?.();
      }
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const goToSection = (index: number) => {
    if (index >= 0 && index < totalSections) {
      setCurrentSectionIndex(index);
    }
  };

  const getSectionProgress = () => {
    return REVIEW_QUESTIONNAIRE.map((section) => {
      const sectionQuestions = section.questions.filter(
        (q) => q.questionType === "SCORE" || q.questionType === "CHECKBOX"
      );
      const answeredQuestions = sectionQuestions.filter(
        (q) => responses[q.id]?.score !== undefined || responses[q.id]?.booleanValue !== undefined
      );
      return {
        section: section.type,
        progress: sectionQuestions.length > 0
          ? (answeredQuestions.length / sectionQuestions.length) * 100
          : 0,
        isComplete: sectionQuestions.length === answeredQuestions.length,
      };
    });
  };

  const sectionProgress = getSectionProgress();

  // Conflict of Interest Modal
  if (conflictModalOpen && conflictDeclared === null) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl font-bold text-gray-900">Conflict of Interest Declaration</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Before accessing this proposal, you must declare any potential conflicts of interest.
            Do you have any personal, professional, or financial relationship with the applicant
            or the research topic that could bias your review?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConflictDeclared(true)}
              className="flex-1 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
            >
              Yes, I have a conflict
            </button>
            <button
              onClick={() => setConflictDeclared(false)}
              className="flex-1 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium"
            >
              No conflict declared
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Your declaration will be recorded and reviewed by the committee.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Left Sidebar - Section Navigation */}
      <div className="w-72 border-r border-gray-200 flex flex-col">
        {/* Progress Summary */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-bold text-primary-600">
              {scoreCalculation
                ? `${Math.round((scoreCalculation.totalScore / scoreCalculation.maxScore) * 100)}%`
                : "0%"}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{
                width: `${
                  scoreCalculation
                    ? (scoreCalculation.totalScore / scoreCalculation.maxScore) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {scoreCalculation
              ? `${scoreCalculation.totalScore.toFixed(1)} / ${scoreCalculation.maxScore.toFixed(0)}`
              : "0 / 100"}{" "}
            points
          </div>
        </div>

        {/* Section List */}
        <div className="flex-1 overflow-y-auto p-2">
          {REVIEW_QUESTIONNAIRE.map((section, index) => {
            const progress = sectionProgress[index];
            const isActive = index === currentSectionIndex;
            const isComplete = progress?.isComplete;

            return (
              <button
                key={section.id}
                onClick={() => goToSection(index)}
                className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? "bg-primary-50 border border-primary-200"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 line-clamp-1">
                    {section.name}
                  </span>
                  {isComplete ? (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <span className="text-xs text-gray-400">
                      {Math.round(progress?.progress || 0)}%
                    </span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full ${
                      isComplete ? "bg-green-500" : "bg-primary-500"
                    }`}
                    style={{ width: `${progress?.progress || 0}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Weight: {section.weight}%
                </div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
          <button
            onClick={() => saveReview(true)}
            disabled={saving}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={submitReview}
            disabled={submitting || !scoreCalculation}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToSection(currentSectionIndex - 1)}
                disabled={currentSectionIndex === 0}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium text-gray-700">
                Section {currentSectionIndex + 1} of {totalSections}
              </span>
              <button
                onClick={() => goToSection(currentSectionIndex + 1)}
                disabled={currentSectionIndex === totalSections - 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`p-2 rounded-lg ${
                showAnnotations ? "bg-primary-100 text-primary-600" : "hover:bg-gray-100"
              }`}
            >
              <StickyNote className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="px-4 border-b border-gray-200 bg-white">
          <nav className="-mb-px flex gap-4">
            <button
              onClick={() => setActiveTab("review")}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === "review"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText className="inline h-4 w-4 mr-1" />
              Review Questions
            </button>
            <button
              onClick={() => setActiveTab("proposal")}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === "proposal"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Eye className="inline h-4 w-4 mr-1" />
              View Proposal
            </button>
          </nav>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "review" && (
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Section Header */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {currentSection.name}
                </h2>
                <p className="text-gray-600">{currentSection.description}</p>
                {currentSection.helpText && (
                  <p className="text-sm text-gray-500 mt-2 italic">
                    {currentSection.helpText}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    Weight: {currentSection.weight}%
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    Max: {currentSection.maxScore} pts
                  </span>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-6">
                {currentSection.questions.map((question, qIndex) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    index={qIndex}
                    response={responses[question.id]}
                    onChange={(response) => handleResponseChange(question.id, response)}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === "proposal" && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Applicant Info */}
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Applicant Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{application.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{application.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Designation</p>
                    <p className="font-medium">{application.currentDesignation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Institution</p>
                    <p className="font-medium">{application.institutionName}</p>
                  </div>
                </div>
              </div>

              {/* Research Proposal */}
              {application.researchProposal && (
                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4">Research Proposal</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Project Title</p>
                      <p className="font-medium">{application.researchProposal.projectTitle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Research Area</p>
                      <p className="font-medium">{application.researchProposal.researchArea}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Objectives</p>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {application.researchProposal.objectives}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Methodology</p>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {application.researchProposal.methodology}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Expected Outcomes</p>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {application.researchProposal.expectedOutcomes}
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-gray-500">Sample Size</p>
                        <p className="font-medium">{application.researchProposal.sampleSize}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Study Duration</p>
                        <p className="font-medium">{application.researchProposal.studyDuration}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Budget */}
              {application.budget && (
                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4">Budget Proposal</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Item</th>
                        <th className="text-right py-2">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">Equipment</td>
                        <td className="text-right">₹{application.budget.equipment?.toLocaleString() || 0}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Consumables</td>
                        <td className="text-right">₹{application.budget.consumables?.toLocaleString() || 0}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Travel</td>
                        <td className="text-right">₹{application.budget.travel?.toLocaleString() || 0}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Documentation</td>
                        <td className="text-right">₹{application.budget.documentation?.toLocaleString() || 0}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Publication</td>
                        <td className="text-right">₹{application.budget.publication?.toLocaleString() || 0}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Other</td>
                        <td className="text-right">₹{application.budget.other?.toLocaleString() || 0}</td>
                      </tr>
                      <tr className="font-bold">
                        <td className="py-2">Total</td>
                        <td className="text-right">₹{application.budget.total?.toLocaleString() || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Annotations (Optional) */}
      {showAnnotations && (
        <div className="w-72 border-l border-gray-200 flex flex-col bg-gray-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Annotations</h3>
            <p className="text-xs text-gray-500">Add notes and highlights to the proposal</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <button className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center gap-2">
              <Highlight className="h-4 w-4" />
              Add Highlight
            </button>
            <button className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center gap-2">
              <StickyNote className="h-4 w-4" />
              Add Sticky Note
            </button>
            <button className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Add Comment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Question Card Component
function QuestionCard({
  question,
  index,
  response,
  onChange,
}: {
  question: any;
  index: number;
  response?: ReviewResponse;
  onChange: (response: Partial<ReviewResponse>) => void;
}) {
  const subsection = question.subsection;

  return (
    <div className={`p-4 border rounded-lg ${subsection ? "bg-gray-50" : "bg-white border-gray-200"}`}>
      {subsection && (
        <p className="text-xs font-medium text-primary-600 uppercase tracking-wider mb-2">
          {subsection}
        </p>
      )}
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
          {index + 1}
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900 mb-1">
            {question.questionText}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </p>
          {question.helpText && (
            <p className="text-sm text-gray-500 mb-3">{question.helpText}</p>
          )}

          {/* Score Input */}
          {question.questionType === "SCORE" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() => onChange({ score })}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                      response?.score === score
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={question.maxScore || 5}
                value={response?.score || 0}
                onChange={(e) => onChange({ score: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          )}

          {/* Text Input */}
          {question.questionType === "TEXT" && (
            <textarea
              value={response?.textValue || ""}
              onChange={(e) => onChange({ textValue: e.target.value })}
              placeholder={question.placeholder || "Enter your response..."}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          )}

          {/* Checkbox Input */}
          {question.questionType === "CHECKBOX" && question.options && (
            <div className="space-y-2">
              {question.options.split("\n").map((option: string, i: number) => (
                <label key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={response?.selectedOptions?.includes(option) || false}
                    onChange={(e) => {
                      const current = response?.selectedOptions || [];
                      const updated = e.target.checked
                        ? [...current, option]
                        : current.filter((o) => o !== option);
                      onChange({ selectedOptions: updated, booleanValue: e.target.checked });
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          )}

          {/* Select Input */}
          {question.questionType === "SELECT" && question.options && (
            <select
              value={response?.selectedOptions?.[0] || ""}
              onChange={(e) => onChange({ selectedOptions: [e.target.value] })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select an option...</option>
              {question.options.split("\n").map((option: string, i: number) => (
                <option key={i} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          {/* Confidence Level */}
          {question.questionType === "CONFIDENCE_LEVEL" && (
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => onChange({ confidenceLevel: level })}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    response?.confidenceLevel === level
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {level}
                </button>
              ))}
              <div className="flex-1 flex justify-between text-xs text-gray-500 px-2">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
