"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Criteria = {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  order: number;
  isActive: boolean;
};

export default function AdminScoringPage() {
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/scoring")
      .then((r) => r.json())
      .then((d) => {
        setCriteria(d.criteria || []);
        if (d.criteria?.length === 0) {
          // Initialize with default criteria
          setCriteria([
            { id: "1", name: "scientific_merit", description: "Scientific Merit", maxScore: 25, order: 1, isActive: true },
            { id: "2", name: "innovation", description: "Innovation", maxScore: 20, order: 2, isActive: true },
            { id: "3", name: "feasibility", description: "Feasibility", maxScore: 20, order: 3, isActive: true },
            { id: "4", name: "budget_justification", description: "Budget Justification", maxScore: 20, order: 4, isActive: true },
            { id: "5", name: "viddhakarma_relevance", description: "Viddhakarma Relevance", maxScore: 15, order: 5, isActive: true },
          ]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function updateCriteria(index: number, field: keyof Criteria, value: string | number | boolean) {
    const updated = [...criteria];
    (updated[index] as Record<string, string | number | boolean>)[field] = value;
    setCriteria(updated);
  }

  function addCriteria() {
    setCriteria([
      ...criteria,
      {
        id: `new-${Date.now()}`,
        name: "",
        description: "",
        maxScore: 10,
        order: criteria.length + 1,
        isActive: true,
      },
    ]);
  }

  function removeCriteria(index: number) {
    setCriteria(criteria.filter((_, i) => i !== index));
  }

  async function saveCriteria() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria }),
      });
      
      if (res.ok) {
        alert("Scoring criteria saved successfully!");
      } else {
        alert("Failed to save criteria");
      }
    } catch (error) {
      console.error(error);
      alert("Error saving criteria");
    }
    setSaving(false);
  }

  const totalMaxScore = criteria.filter((c) => c.isActive).reduce((sum, c) => sum + c.maxScore, 0);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scoring Criteria</h1>
          <p className="mt-1 text-gray-600">
            Configure evaluation criteria for research committee scoring
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Maximum Score</p>
          <p className="text-2xl font-bold text-primary-600">{totalMaxScore}</p>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Define the criteria that reviewers will use to evaluate applications. 
            Changes will be reflected in the committee scoring form.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium w-12">Order</th>
                <th className="px-4 py-3 font-medium w-32">Field Name</th>
                <th className="px-4 py-3 font-medium">Display Name / Description</th>
                <th className="px-4 py-3 font-medium w-24 text-center">Max Score</th>
                <th className="px-4 py-3 font-medium w-20 text-center">Active</th>
                <th className="px-4 py-3 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((item, index) => (
                <tr key={item.id} className="border-b">
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      value={item.order}
                      onChange={(e) => updateCriteria(index, "order", parseInt(e.target.value) || 0)}
                      className="w-16 text-center"
                      min={1}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      value={item.name}
                      onChange={(e) => updateCriteria(index, "name", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                      placeholder="field_name"
                      className="font-mono text-xs"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      value={item.description}
                      onChange={(e) => updateCriteria(index, "description", e.target.value)}
                      placeholder="Criteria description"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      value={item.maxScore}
                      onChange={(e) => updateCriteria(index, "maxScore", parseFloat(e.target.value) || 0)}
                      className="w-20 text-center"
                      min={0}
                      step={0.5}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(e) => updateCriteria(index, "isActive", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => removeCriteria(index)}
                      className="text-red-500 hover:text-red-700"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-medium">
                <td colSpan={3} className="px-4 py-3 text-right">Total:</td>
                <td className="px-4 py-3 text-center">{totalMaxScore}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-4">
          <Button onClick={addCriteria} variant="secondary">
            + Add Criteria
          </Button>
          <Button onClick={saveCriteria} loading={saving}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-medium text-gray-900 mb-2">Preview</h3>
        <p className="text-sm text-gray-600 mb-4">
          How the criteria will appear to reviewers:
        </p>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          {criteria.filter((c) => c.isActive).sort((a, b) => a.order - b.order).map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.description}</span>
              <span className="text-gray-500">Max: {item.maxScore}</span>
            </div>
          ))}
          <div className="border-t border-gray-300 pt-2 flex justify-between font-medium">
            <span>Total</span>
            <span>{totalMaxScore}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
