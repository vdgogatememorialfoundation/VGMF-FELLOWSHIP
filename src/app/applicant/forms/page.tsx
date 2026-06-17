"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { RESEARCH_AREAS, BUDGET_MAX, MANDATORY_DOCUMENTS, OPTIONAL_DOCUMENTS, formatCurrency } from "@/lib/utils";

const STEPS = ["Personal & Professional", "Research Proposal", "Budget", "Documents", "Review & Submit"];

function ApplicationFormsContent() {
  const [step, setStep] = useState(0);
  const [applicationId, setApplicationId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const [personal, setPersonal] = useState({
    name: "", dob: "", gender: "", address: "", city: "", state: "",
    country: "India", pincode: "", mobile: "", email: "",
    bamsCollege: "", yearOfPassing: "", mdMsPhdDetails: "",
    currentDesignation: "", institutionName: "", registrationCouncil: "",
    registrationNumber: "", yearsOfPractice: "", viddhakarmaExperience: "",
    publicationsSummary: "",
  });

  const [research, setResearch] = useState({
    projectTitle: "", researchArea: "", researchAreaOther: "",
    objectives: "", methodology: "", sampleSize: "",
    studyDuration: "", expectedOutcomes: "", budgetSummary: "",
  });

  const [budget, setBudget] = useState({
    equipment: 0, consumables: 0, travel: 0,
    documentation: 0, publication: 0, other: 0,
  });

  const budgetTotal = Object.values(budget).reduce((a, b) => a + Number(b), 0);

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((data) => {
        const app = data.applications?.[0];
        if (app) {
          setApplicationId(app.id);
          setPersonal({
            name: app.name || "", dob: app.dob?.split("T")[0] || "",
            gender: app.gender || "", address: app.address || "",
            city: app.city || "", state: app.state || "",
            country: app.country || "India", pincode: app.pincode || "",
            mobile: app.mobile || "", email: app.email || "",
            bamsCollege: app.bamsCollege || "", yearOfPassing: String(app.yearOfPassing || ""),
            mdMsPhdDetails: app.mdMsPhdDetails || "",
            currentDesignation: app.currentDesignation || "",
            institutionName: app.institutionName || "",
            registrationCouncil: app.registrationCouncil || "",
            registrationNumber: app.registrationNumber || "",
            yearsOfPractice: String(app.yearsOfPractice || ""),
            viddhakarmaExperience: app.viddhakarmaExperience || "",
            publicationsSummary: app.publicationsSummary || "",
          });
          if (app.researchProposal) setResearch({ ...app.researchProposal, researchAreaOther: app.researchProposal.researchAreaOther || "" });
          if (app.budget) setBudget(app.budget);
        }
      });
  }, []);

  async function saveStep(stepName: string, data: Record<string, unknown>) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: stepName, data, applicationId }),
    });
    const result = await res.json();
    setLoading(false);
    if (!res.ok) { setError(result.error); return false; }
    if (result.application) setApplicationId(result.application.id);
    return true;
  }

  async function handleUpload(type: string, file: File) {
    if (!applicationId) { setError("Save personal details first"); return; }
    const formData = new FormData();
    formData.append("applicationId", applicationId);
    formData.append("type", type);
    formData.append("file", file);
    const res = await fetch("/api/documents", { method: "POST", body: formData });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setSuccess(`${type} uploaded successfully`);
  }

  async function handleSubmit() {
    setLoading(true);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "submit", applicationId }),
    });
    const result = await res.json();
    setLoading(false);
    if (!res.ok) { setError(result.error); return; }
    setSuccess("Application submitted successfully!");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fellowship Application</h1>
        <p className="mt-1 text-gray-600">Complete all sections to submit your application</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
              i === step ? "bg-primary-600 text-white" : i < step ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {step === 0 && (
        <div className="card space-y-6">
          <h2 className="text-lg font-semibold">Personal Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={personal.name} onChange={(e) => setPersonal({ ...personal, name: e.target.value })} required />
            <Input label="Date of Birth" type="date" value={personal.dob} onChange={(e) => setPersonal({ ...personal, dob: e.target.value })} required />
            <Select label="Gender" value={personal.gender} onChange={(e) => setPersonal({ ...personal, gender: e.target.value })} options={[{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "OTHER", label: "Other" }]} />
            <Input label="Mobile" value={personal.mobile} onChange={(e) => setPersonal({ ...personal, mobile: e.target.value })} required />
            <Input label="Email" type="email" value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} required />
            <Input label="Pincode" value={personal.pincode} onChange={(e) => setPersonal({ ...personal, pincode: e.target.value })} required />
          </div>
          <Textarea label="Address" value={personal.address} onChange={(e) => setPersonal({ ...personal, address: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="City" value={personal.city} onChange={(e) => setPersonal({ ...personal, city: e.target.value })} />
            <Input label="State" value={personal.state} onChange={(e) => setPersonal({ ...personal, state: e.target.value })} />
            <Input label="Country" value={personal.country} onChange={(e) => setPersonal({ ...personal, country: e.target.value })} />
          </div>

          <h2 className="text-lg font-semibold pt-4 border-t">Professional Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="BAMS College" value={personal.bamsCollege} onChange={(e) => setPersonal({ ...personal, bamsCollege: e.target.value })} required />
            <Input label="Year of Passing" type="number" value={personal.yearOfPassing} onChange={(e) => setPersonal({ ...personal, yearOfPassing: e.target.value })} required />
            <Input label="MD/MS/PhD Details" value={personal.mdMsPhdDetails} onChange={(e) => setPersonal({ ...personal, mdMsPhdDetails: e.target.value })} />
            <Input label="Current Designation" value={personal.currentDesignation} onChange={(e) => setPersonal({ ...personal, currentDesignation: e.target.value })} required />
            <Input label="Institution/Clinic Name" value={personal.institutionName} onChange={(e) => setPersonal({ ...personal, institutionName: e.target.value })} required />
            <Input label="Registration Council" value={personal.registrationCouncil} onChange={(e) => setPersonal({ ...personal, registrationCouncil: e.target.value })} required />
            <Input label="Registration Number" value={personal.registrationNumber} onChange={(e) => setPersonal({ ...personal, registrationNumber: e.target.value })} required />
            <Input label="Years of Clinical Practice" type="number" value={personal.yearsOfPractice} onChange={(e) => setPersonal({ ...personal, yearsOfPractice: e.target.value })} required />
          </div>
          <Textarea label="Viddhakarma Experience" value={personal.viddhakarmaExperience} onChange={(e) => setPersonal({ ...personal, viddhakarmaExperience: e.target.value })} />
          <Textarea label="Publications" value={personal.publicationsSummary} onChange={(e) => setPersonal({ ...personal, publicationsSummary: e.target.value })} />

          <Button loading={loading} onClick={async () => { if (await saveStep("personal", personal)) setStep(1); }}>
            Save & Continue
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Research Proposal</h2>
          <Input label="Project Title" value={research.projectTitle} onChange={(e) => setResearch({ ...research, projectTitle: e.target.value })} required />
          <Select label="Research Area" value={research.researchArea} onChange={(e) => setResearch({ ...research, researchArea: e.target.value })} options={RESEARCH_AREAS.map((a) => ({ value: a.value, label: a.label }))} />
          {research.researchArea === "OTHER" && (
            <Input label="Specify Research Area" value={research.researchAreaOther} onChange={(e) => setResearch({ ...research, researchAreaOther: e.target.value })} />
          )}
          <Textarea label="Research Objectives" value={research.objectives} onChange={(e) => setResearch({ ...research, objectives: e.target.value })} />
          <Textarea label="Methodology" value={research.methodology} onChange={(e) => setResearch({ ...research, methodology: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Sample Size" value={research.sampleSize} onChange={(e) => setResearch({ ...research, sampleSize: e.target.value })} />
            <Input label="Study Duration" value={research.studyDuration} onChange={(e) => setResearch({ ...research, studyDuration: e.target.value })} />
          </div>
          <Textarea label="Expected Outcomes" value={research.expectedOutcomes} onChange={(e) => setResearch({ ...research, expectedOutcomes: e.target.value })} />
          <Textarea label="Budget Summary" value={research.budgetSummary} onChange={(e) => setResearch({ ...research, budgetSummary: e.target.value })} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
            <Button loading={loading} onClick={async () => { if (await saveStep("research", research)) setStep(2); }}>Save & Continue</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Budget Management</h2>
          <p className="text-sm text-gray-600">Maximum budget: {formatCurrency(BUDGET_MAX)}</p>
          {(["equipment", "consumables", "travel", "documentation", "publication", "other"] as const).map((item) => (
            <Input
              key={item}
              label={item.charAt(0).toUpperCase() + item.slice(1)}
              type="number"
              value={budget[item]}
              onChange={(e) => setBudget({ ...budget, [item]: Number(e.target.value) })}
            />
          ))}
          <div className={`rounded-lg p-4 ${budgetTotal > BUDGET_MAX ? "bg-red-50" : "bg-green-50"}`}>
            <p className="text-sm font-medium">Total: {formatCurrency(budgetTotal)}</p>
            {budgetTotal > BUDGET_MAX && <p className="text-sm text-red-600">Exceeds maximum of {formatCurrency(BUDGET_MAX)}</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button loading={loading} disabled={budgetTotal > BUDGET_MAX} onClick={async () => { if (await saveStep("budget", budget)) setStep(3); }}>Save & Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card space-y-6">
          <h2 className="text-lg font-semibold">Document Uploads</h2>
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Mandatory Documents</h3>
            <div className="space-y-3">
              {MANDATORY_DOCUMENTS.map((doc) => (
                <div key={doc.type} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">{doc.label}</span>
                  <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => { if (e.target.files?.[0]) handleUpload(doc.type, e.target.files[0]); }} className="text-sm" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Optional Documents</h3>
            <div className="space-y-3">
              {OPTIONAL_DOCUMENTS.map((doc) => (
                <div key={doc.type} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">{doc.label}</span>
                  <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => { if (e.target.files?.[0]) handleUpload(doc.type, e.target.files[0]); }} className="text-sm" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => setStep(4)}>Continue to Review</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Review & Submit</h2>
          <p className="text-sm text-gray-600">Please review your application before submitting. Once submitted, you cannot edit unless requested by admin.</p>
          <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
            <p><strong>Name:</strong> {personal.name}</p>
            <p><strong>Project:</strong> {research.projectTitle || "Not filled"}</p>
            <p><strong>Budget Total:</strong> {formatCurrency(budgetTotal)}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>
            <Button loading={loading} onClick={handleSubmit}>Submit Application</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FormsPage() {
  return <ApplicationFormsContent />;
}
