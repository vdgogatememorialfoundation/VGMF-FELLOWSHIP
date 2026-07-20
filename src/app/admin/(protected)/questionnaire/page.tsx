"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  Eye,
  EyeOff,
  FileQuestion,
  Weight,
  Clock,
} from "lucide-react";

interface ReviewSection {
  id: string;
  name: string;
  type: string;
  description?: string;
  helpText?: string;
  order: number;
  weight: number;
  maxScore: number;
  isRequired: boolean;
  isActive: boolean;
  questions?: ReviewQuestion[];
}

interface ReviewQuestion {
  id: string;
  sectionId: string;
  questionText: string;
  questionType: string;
  helpText?: string;
  placeholder?: string;
  maxScore?: number;
  weight: number;
  required: boolean;
  options?: string;
  minValue?: number;
  maxValue?: number;
  subsection?: string;
  order: number;
  isActive: boolean;
}

const QUESTION_TYPES = [
  { value: "SCORE", label: "Score (0-5)", icon: "📊" },
  { value: "CHECKBOX", label: "Checkbox", icon: "☑️" },
  { value: "TEXT", label: "Text Response", icon: "📝" },
  { value: "SELECT", label: "Dropdown Select", icon: "▼" },
  { value: "TABLE", label: "Table", icon: "📋" },
  { value: "CONFIDENCE_LEVEL", label: "Confidence Level", icon: "🎯" },
];

export default function QuestionnairePage() {
  const router = useRouter();
  const [sections, setSections] = useState<ReviewSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"sections" | "questions">("sections");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const res = await fetch("/api/admin/questionnaire/sections");
      if (res.ok) {
        const data = await res.json();
        setSections(data);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const addSection = async () => {
    try {
      const res = await fetch("/api/admin/questionnaire/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Section",
          type: "SCIENTIFIC_VALIDITY",
          description: "",
          order: sections.length,
          weight: 10,
          maxScore: 100,
          isRequired: true,
          isActive: true,
        }),
      });
      if (res.ok) {
        const newSection = await res.json();
        setSections([...sections, newSection]);
        setExpandedSections(new Set([...expandedSections, newSection.id]));
        setEditingSection(newSection.id);
        setHasChanges(true);
      }
    } catch (error) {
      console.error("Error adding section:", error);
    }
  };

  const updateSection = async (sectionId: string, updates: Partial<ReviewSection>) => {
    try {
      const res = await fetch(`/api/admin/questionnaire/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setSections(sections.map((s) => (s.id === sectionId ? { ...s, ...updated } : s)));
        setHasChanges(true);
      }
    } catch (error) {
      console.error("Error updating section:", error);
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm("Are you sure you want to delete this section and all its questions?")) return;
    try {
      const res = await fetch(`/api/admin/questionnaire/sections/${sectionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSections(sections.filter((s) => s.id !== sectionId));
        setHasChanges(true);
      }
    } catch (error) {
      console.error("Error deleting section:", error);
    }
  };

  const addQuestion = async (sectionId: string) => {
    try {
      const res = await fetch("/api/admin/questionnaire/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          questionText: "New Question",
          questionType: "SCORE",
          order: 0,
          maxScore: 5,
          weight: 1,
          required: true,
          isActive: true,
        }),
      });
      if (res.ok) {
        const newQuestion = await res.json();
        setSections(
          sections.map((s) =>
            s.id === sectionId
              ? { ...s, questions: [...(s.questions || []), newQuestion] }
              : s
          )
        );
        setEditingQuestion(newQuestion.id);
        setHasChanges(true);
      }
    } catch (error) {
      console.error("Error adding question:", error);
    }
  };

  const updateQuestion = async (questionId: string, updates: Partial<ReviewQuestion>) => {
    try {
      const res = await fetch(`/api/admin/questionnaire/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setSections(
          sections.map((s) => ({
            ...s,
            questions: (s.questions || []).map((q) =>
              q.id === questionId ? { ...q, ...updated } : q
            ),
          }))
        );
        setHasChanges(true);
      }
    } catch (error) {
      console.error("Error updating question:", error);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`/api/admin/questionnaire/questions/${questionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSections(
          sections.map((s) => ({
            ...s,
            questions: (s.questions || []).filter((q) => q.id !== questionId),
          }))
        );
        setHasChanges(true);
      }
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Save sections
      for (const section of sections) {
        await fetch(`/api/admin/questionnaire/sections/${section.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order: section.order,
            isActive: section.isActive,
            weight: section.weight,
          }),
        });
        // Save questions
        for (const question of section.questions || []) {
          await fetch(`/api/admin/questionnaire/questions/${question.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order: question.order,
              isActive: question.isActive,
            }),
          });
        }
      }
      setHasChanges(false);
      alert("Changes saved successfully!");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error saving changes");
    } finally {
      setSaving(false);
    }
  };

  const moveSection = async (sectionId: string, direction: "up" | "down") => {
    const index = sections.findIndex((s) => s.id === sectionId);
    if (direction === "up" && index > 0) {
      const newSections = [...sections];
      [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
      setSections(newSections);
      setHasChanges(true);
    } else if (direction === "down" && index < sections.length - 1) {
      const newSections = [...sections];
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      setSections(newSections);
      setHasChanges(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading questionnaire...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Questionnaire</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure the evaluation questionnaire for research proposal reviews
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-amber-600">Unsaved changes</span>
          )}
          <button
            onClick={saveAll}
            disabled={saving || !hasChanges}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("sections")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "sections"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <FileQuestion className="inline-block h-4 w-4 mr-2" />
            Sections ({sections.length})
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "questions"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Questions ({sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0)})
          </button>
        </nav>
      </div>

      {/* Sections List */}
      {activeTab === "sections" && (
        <div className="space-y-4">
          <button
            onClick={addSection}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add New Section
          </button>

          {sections.map((section, index) => (
            <div
              key={section.id}
              className={`border rounded-lg overflow-hidden ${
                section.isActive ? "border-gray-200" : "border-gray-200 bg-gray-50 opacity-60"
              }`}
            >
              {/* Section Header */}
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{section.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                        {section.type}
                      </span>
                      {!section.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {section.questions?.length || 0} questions • Weight: {section.weight}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => moveSection(section.id, "up")}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveSection(section.id, "down")}
                    disabled={index === sections.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Section Edit Form */}
              {editingSection === section.id && (
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Section Name
                      </label>
                      <input
                        type="text"
                        value={section.name}
                        onChange={(e) => updateSection(section.id, { name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={section.type}
                        onChange={(e) => updateSection(section.id, { type: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="SCIENTIFIC_VALIDITY">Scientific Validity</option>
                        <option value="CONTRIBUTION">Contribution</option>
                        <option value="LITERATURE">Literature Review</option>
                        <option value="METHODOLOGY">Methodology</option>
                        <option value="STATISTICS">Statistics</option>
                        <option value="ETHICS">Ethics</option>
                        <option value="INVESTIGATOR">Investigator</option>
                        <option value="BUDGET">Budget</option>
                        <option value="EXPECTED_OUTCOMES">Expected Outcomes</option>
                        <option value="FINAL_RECOMMENDATION">Final Recommendation</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={section.description || ""}
                        onChange={(e) => updateSection(section.id, { description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Weight className="inline h-4 w-4 mr-1" />
                        Weight (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={section.weight}
                        onChange={(e) => updateSection(section.id, { weight: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Score
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={section.maxScore}
                        onChange={(e) => updateSection(section.id, { maxScore: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={section.isRequired}
                          onChange={(e) => updateSection(section.id, { isRequired: e.target.checked })}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Required</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={section.isActive}
                          onChange={(e) => updateSection(section.id, { isActive: e.target.checked })}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Questions List */}
              {expandedSections.has(section.id) && (
                <div className="border-t border-gray-200">
                  <div className="p-4 space-y-3">
                    {section.questions?.map((question, qIndex) => (
                      <div
                        key={question.id}
                        className={`p-3 rounded-lg border ${
                          question.isActive
                            ? "border-gray-200 bg-white"
                            : "border-gray-200 bg-gray-50 opacity-60"
                        }`}
                      >
                        {editingQuestion === question.id ? (
                          <QuestionEditForm
                            question={question}
                            onUpdate={(updates) => updateQuestion(question.id, updates)}
                            onClose={() => setEditingQuestion(null)}
                          />
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-500">
                                  Q{qIndex + 1}.
                                </span>
                                <span className="text-sm text-gray-900">{question.questionText}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                  {question.questionType}
                                </span>
                                {question.required && (
                                  <span className="text-xs text-red-500">*</span>
                                )}
                              </div>
                              {question.subsection && (
                                <p className="text-xs text-gray-500 mt-1 ml-7">
                                  Subsection: {question.subsection}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => setEditingQuestion(question.id)}
                                className="p-1 text-gray-400 hover:text-blue-600"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteQuestion(question.id)}
                                className="p-1 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addQuestion(section.id)}
                      className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Question
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.id} className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">{section.name}</h3>
                <p className="text-sm text-gray-500">
                  {section.questions?.length || 0} questions
                </p>
              </div>
              <div className="divide-y divide-gray-200">
                {section.questions?.map((question, index) => (
                  <div
                    key={question.id}
                    className={`p-4 flex items-start gap-4 ${
                      question.isActive ? "" : "opacity-50"
                    }`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {question.questionText}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {question.questionType}
                        </span>
                        {question.maxScore && (
                          <span className="text-xs text-gray-500">
                            Max: {question.maxScore}
                          </span>
                        )}
                        {question.weight !== 1 && (
                          <span className="text-xs text-gray-500">
                            Weight: {question.weight}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {question.isActive ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                      <button
                        onClick={() =>
                          updateQuestion(question.id, { isActive: !question.isActive })
                        }
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {question.isActive ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                ))}
                {(!section.questions || section.questions.length === 0) && (
                  <div className="p-4 text-center text-gray-500">
                    No questions in this section
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Question Edit Form Component
function QuestionEditForm({
  question,
  onUpdate,
  onClose,
}: {
  question: ReviewQuestion;
  onUpdate: (updates: Partial<ReviewQuestion>) => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question Text
        </label>
        <textarea
          value={question.questionText}
          onChange={(e) => onUpdate({ questionText: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question Type
          </label>
          <select
            value={question.questionType}
            onChange={(e) => onUpdate({ questionType: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subsection (optional)
          </label>
          <input
            type="text"
            value={question.subsection || ""}
            onChange={(e) => onUpdate({ subsection: e.target.value || undefined })}
            placeholder="e.g., Methodology"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Score
          </label>
          <input
            type="number"
            min="0"
            value={question.maxScore || ""}
            onChange={(e) => onUpdate({ maxScore: parseInt(e.target.value) || undefined })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Weight
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={question.weight}
            onChange={(e) => onUpdate({ weight: parseFloat(e.target.value) || 1 })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Help Text
          </label>
          <textarea
            value={question.helpText || ""}
            onChange={(e) => onUpdate({ helpText: e.target.value || undefined })}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Guidance for reviewers..."
          />
        </div>
        {question.questionType === "SELECT" && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Options (one per line)
            </label>
            <textarea
              value={question.options || ""}
              onChange={(e) => onUpdate({ options: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Option 1&#10;Option 2&#10;Option 3"
            />
          </div>
        )}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Required</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={question.isActive}
              onChange={(e) => onUpdate({ isActive: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Done
        </button>
      </div>
    </div>
  );
}
