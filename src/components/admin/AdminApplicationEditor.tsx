"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

const RESEARCH_AREAS = [
  { value: "MUSCULOSKELETAL_DISORDERS", label: "Musculoskeletal Disorders" },
  { value: "PAIN_MANAGEMENT", label: "Pain Management" },
  { value: "NEUROLOGICAL_DISORDERS", label: "Neurological Disorders" },
  { value: "COMPARATIVE_STUDIES", label: "Comparative Studies" },
  { value: "MECHANISM_BASED_RESEARCH", label: "Mechanism Based Research" },
  { value: "CLASSICAL_DOCUMENTATION", label: "Classical Documentation" },
  { value: "PROTOCOL_DEVELOPMENT", label: "Protocol Development" },
  { value: "OTHER", label: "Other" },
];

type EditableApplication = {
  id: string;
  name: string;
  dob: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  mobile: string;
  email: string;
  bamsCollege: string;
  yearOfPassing: number;
  mdMsPhdDetails?: string | null;
  currentDesignation: string;
  institutionName: string;
  registrationCouncil: string;
  registrationNumber: string;
  yearsOfPractice: number;
  viddhakarmaExperience?: string | null;
  publicationsSummary?: string | null;
  adminNotes?: string | null;
  verificationNotes?: string | null;
  eligibilityNotes?: string | null;
  researchProposal: {
    projectTitle?: string;
    researchArea?: string;
    researchAreaOther?: string | null;
    objectives?: string;
    methodology?: string;
    sampleSize?: string;
    studyDuration?: string;
    expectedOutcomes?: string;
    budgetSummary?: string;
  } | null;
  budget: {
    equipment: number;
    consumables: number;
    travel: number;
    documentation: number;
    publication: number;
    other: number;
    total: number;
  } | null;
};

function toDateInput(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function AdminApplicationEditor({
  application,
  onSaved,
}: {
  application: EditableApplication;
  onSaved: () => void;
}) {
  const [personal, setPersonal] = useState({
    name: application.name,
    dob: toDateInput(application.dob),
    gender: application.gender,
    address: application.address,
    city: application.city,
    state: application.state,
    country: application.country || "India",
    pincode: application.pincode,
    mobile: application.mobile,
    email: application.email,
    bamsCollege: application.bamsCollege,
    yearOfPassing: String(application.yearOfPassing),
    mdMsPhdDetails: application.mdMsPhdDetails ?? "",
    currentDesignation: application.currentDesignation,
    institutionName: application.institutionName,
    registrationCouncil: application.registrationCouncil,
    registrationNumber: application.registrationNumber,
    yearsOfPractice: String(application.yearsOfPractice),
    viddhakarmaExperience: application.viddhakarmaExperience ?? "",
    publicationsSummary: application.publicationsSummary ?? "",
  });

  const [notes, setNotes] = useState({
    adminNotes: application.adminNotes ?? "",
    verificationNotes: application.verificationNotes ?? "",
    eligibilityNotes: application.eligibilityNotes ?? "",
  });

  const [proposal, setProposal] = useState({
    projectTitle: application.researchProposal?.projectTitle ?? "",
    researchArea: application.researchProposal?.researchArea ?? "OTHER",
    researchAreaOther: application.researchProposal?.researchAreaOther ?? "",
    objectives: application.researchProposal?.objectives ?? "",
    methodology: application.researchProposal?.methodology ?? "",
    sampleSize: application.researchProposal?.sampleSize ?? "",
    studyDuration: application.researchProposal?.studyDuration ?? "",
    expectedOutcomes: application.researchProposal?.expectedOutcomes ?? "",
    budgetSummary: application.researchProposal?.budgetSummary ?? "",
  });

  const [budget, setBudget] = useState({
    equipment: String(application.budget?.equipment ?? 0),
    consumables: String(application.budget?.consumables ?? 0),
    travel: String(application.budget?.travel ?? 0),
    documentation: String(application.budget?.documentation ?? 0),
    publication: String(application.budget?.publication ?? 0),
    other: String(application.budget?.other ?? 0),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPersonal({
      name: application.name,
      dob: toDateInput(application.dob),
      gender: application.gender,
      address: application.address,
      city: application.city,
      state: application.state,
      country: application.country || "India",
      pincode: application.pincode,
      mobile: application.mobile,
      email: application.email,
      bamsCollege: application.bamsCollege,
      yearOfPassing: String(application.yearOfPassing),
      mdMsPhdDetails: application.mdMsPhdDetails ?? "",
      currentDesignation: application.currentDesignation,
      institutionName: application.institutionName,
      registrationCouncil: application.registrationCouncil,
      registrationNumber: application.registrationNumber,
      yearsOfPractice: String(application.yearsOfPractice),
      viddhakarmaExperience: application.viddhakarmaExperience ?? "",
      publicationsSummary: application.publicationsSummary ?? "",
    });
    setNotes({
      adminNotes: application.adminNotes ?? "",
      verificationNotes: application.verificationNotes ?? "",
      eligibilityNotes: application.eligibilityNotes ?? "",
    });
    setProposal({
      projectTitle: application.researchProposal?.projectTitle ?? "",
      researchArea: application.researchProposal?.researchArea ?? "OTHER",
      researchAreaOther: application.researchProposal?.researchAreaOther ?? "",
      objectives: application.researchProposal?.objectives ?? "",
      methodology: application.researchProposal?.methodology ?? "",
      sampleSize: application.researchProposal?.sampleSize ?? "",
      studyDuration: application.researchProposal?.studyDuration ?? "",
      expectedOutcomes: application.researchProposal?.expectedOutcomes ?? "",
      budgetSummary: application.researchProposal?.budgetSummary ?? "",
    });
    setBudget({
      equipment: String(application.budget?.equipment ?? 0),
      consumables: String(application.budget?.consumables ?? 0),
      travel: String(application.budget?.travel ?? 0),
      documentation: String(application.budget?.documentation ?? 0),
      publication: String(application.budget?.publication ?? 0),
      other: String(application.budget?.other ?? 0),
    });
  }, [application]);

  const budgetTotal = useMemo(() => {
    return (
      Number(budget.equipment || 0) +
      Number(budget.consumables || 0) +
      Number(budget.travel || 0) +
      Number(budget.documentation || 0) +
      Number(budget.publication || 0) +
      Number(budget.other || 0)
    );
  }, [budget]);

  async function save() {
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/admin/applications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: application.id,
        personal: {
          ...personal,
          yearOfPassing: Number(personal.yearOfPassing),
          yearsOfPractice: Number(personal.yearsOfPractice),
          gender: personal.gender as "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY",
        },
        notes,
        researchProposal: {
          ...proposal,
          researchArea: proposal.researchArea as (typeof RESEARCH_AREAS)[number]["value"],
        },
        budget: {
          equipment: Number(budget.equipment || 0),
          consumables: Number(budget.consumables || 0),
          travel: Number(budget.travel || 0),
          documentation: Number(budget.documentation || 0),
          publication: Number(budget.publication || 0),
          other: Number(budget.other || 0),
        },
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to save application");
      return;
    }

    setMessage("Application updated successfully");
    onSaved();
  }

  return (
    <div className="card space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Edit Application Details</h2>
          <p className="text-sm text-gray-500">
            Update applicant information, proposal, budget, and admin notes
          </p>
        </div>
        <Button loading={loading} onClick={save}>
          Save Changes
        </Button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Personal</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" value={personal.name} onChange={(e) => setPersonal({ ...personal, name: e.target.value })} />
          <Input label="Date of birth" type="date" value={personal.dob} onChange={(e) => setPersonal({ ...personal, dob: e.target.value })} />
          <Select label="Gender" value={personal.gender} onChange={(e) => setPersonal({ ...personal, gender: e.target.value })} options={GENDER_OPTIONS} />
          <Input label="Email" type="email" value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} />
          <Input label="Mobile" value={personal.mobile} onChange={(e) => setPersonal({ ...personal, mobile: e.target.value })} />
          <Input label="Pincode" value={personal.pincode} onChange={(e) => setPersonal({ ...personal, pincode: e.target.value })} />
          <Input label="City" value={personal.city} onChange={(e) => setPersonal({ ...personal, city: e.target.value })} />
          <Input label="State" value={personal.state} onChange={(e) => setPersonal({ ...personal, state: e.target.value })} />
          <Input label="Country" value={personal.country} onChange={(e) => setPersonal({ ...personal, country: e.target.value })} />
        </div>
        <Textarea label="Address" value={personal.address} onChange={(e) => setPersonal({ ...personal, address: e.target.value })} />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Professional</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="BAMS college" value={personal.bamsCollege} onChange={(e) => setPersonal({ ...personal, bamsCollege: e.target.value })} />
          <Input label="Year of passing" type="number" value={personal.yearOfPassing} onChange={(e) => setPersonal({ ...personal, yearOfPassing: e.target.value })} />
          <Input label="Current designation" value={personal.currentDesignation} onChange={(e) => setPersonal({ ...personal, currentDesignation: e.target.value })} />
          <Input label="Institution" value={personal.institutionName} onChange={(e) => setPersonal({ ...personal, institutionName: e.target.value })} />
          <Input label="Registration council" value={personal.registrationCouncil} onChange={(e) => setPersonal({ ...personal, registrationCouncil: e.target.value })} />
          <Input label="Registration number" value={personal.registrationNumber} onChange={(e) => setPersonal({ ...personal, registrationNumber: e.target.value })} />
          <Input label="Years of practice" type="number" value={personal.yearsOfPractice} onChange={(e) => setPersonal({ ...personal, yearsOfPractice: e.target.value })} />
        </div>
        <Textarea label="MD/MS/PhD details" value={personal.mdMsPhdDetails} onChange={(e) => setPersonal({ ...personal, mdMsPhdDetails: e.target.value })} />
        <Textarea label="Viddhakarma experience" value={personal.viddhakarmaExperience} onChange={(e) => setPersonal({ ...personal, viddhakarmaExperience: e.target.value })} />
        <Textarea label="Publications summary" value={personal.publicationsSummary} onChange={(e) => setPersonal({ ...personal, publicationsSummary: e.target.value })} />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Research Proposal</h3>
        <Input label="Project title" value={proposal.projectTitle} onChange={(e) => setProposal({ ...proposal, projectTitle: e.target.value })} />
        <Select label="Research area" value={proposal.researchArea} onChange={(e) => setProposal({ ...proposal, researchArea: e.target.value })} options={RESEARCH_AREAS} />
        {proposal.researchArea === "OTHER" && (
          <Input label="Other research area" value={proposal.researchAreaOther} onChange={(e) => setProposal({ ...proposal, researchAreaOther: e.target.value })} />
        )}
        <Textarea label="Objectives" value={proposal.objectives} onChange={(e) => setProposal({ ...proposal, objectives: e.target.value })} />
        <Textarea label="Methodology" value={proposal.methodology} onChange={(e) => setProposal({ ...proposal, methodology: e.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Sample size" value={proposal.sampleSize} onChange={(e) => setProposal({ ...proposal, sampleSize: e.target.value })} />
          <Input label="Study duration" value={proposal.studyDuration} onChange={(e) => setProposal({ ...proposal, studyDuration: e.target.value })} />
        </div>
        <Textarea label="Expected outcomes" value={proposal.expectedOutcomes} onChange={(e) => setProposal({ ...proposal, expectedOutcomes: e.target.value })} />
        <Textarea label="Budget summary" value={proposal.budgetSummary} onChange={(e) => setProposal({ ...proposal, budgetSummary: e.target.value })} />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Budget Breakdown</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["equipment", "consumables", "travel", "documentation", "publication", "other"] as const).map((key) => (
            <Input
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              type="number"
              min={0}
              value={budget[key]}
              onChange={(e) => setBudget({ ...budget, [key]: e.target.value })}
            />
          ))}
        </div>
        <p className="text-sm font-semibold text-primary-700">
          Total: {formatCurrency(budgetTotal)} {budgetTotal > 75000 ? "(exceeds ₹75,000 limit)" : ""}
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Admin Notes</h3>
        <Textarea label="Admin notes" value={notes.adminNotes} onChange={(e) => setNotes({ ...notes, adminNotes: e.target.value })} />
        <Textarea label="Verification notes" value={notes.verificationNotes} onChange={(e) => setNotes({ ...notes, verificationNotes: e.target.value })} />
        <Textarea label="Eligibility notes" value={notes.eligibilityNotes} onChange={(e) => setNotes({ ...notes, eligibilityNotes: e.target.value })} />
      </section>
    </div>
  );
}
