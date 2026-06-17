import prisma from "./db";
import type { Gender, ResearchArea } from "@prisma/client";
import { generateApplicationNumber } from "./application-number";

type FormData = Record<string, unknown>;

function formStr(data: FormData, key: string, fallback = ""): string {
  const value = data[key];
  if (value == null || value === "") return fallback;
  return String(value).trim();
}

function formInt(data: FormData, key: string, fallback = 0): number {
  const value = Number(data[key]);
  return Number.isFinite(value) ? value : fallback;
}

function mapGender(value: string): Gender {
  const normalized = value.trim().toUpperCase();
  if (normalized === "MALE" || normalized === "M") return "MALE";
  if (normalized === "FEMALE" || normalized === "F") return "FEMALE";
  return "OTHER";
}

function mapResearchArea(value: string): ResearchArea {
  const map: Record<string, ResearchArea> = {
    "MUSCULOSKELETAL DISORDERS": "MUSCULOSKELETAL_DISORDERS",
    "PAIN MANAGEMENT": "PAIN_MANAGEMENT",
    "NEUROLOGICAL DISORDERS": "NEUROLOGICAL_DISORDERS",
    OTHER: "OTHER",
  };
  return map[value.trim().toUpperCase()] ?? "OTHER";
}

function buildApplicationFields(data: FormData) {
  return {
    name: formStr(data, "name", "Applicant"),
    dob: new Date(formStr(data, "dob", "2000-01-01")),
    gender: mapGender(formStr(data, "gender", "Other")),
    address: formStr(data, "address", "—"),
    city: formStr(data, "city", "—"),
    state: formStr(data, "state", "—"),
    country: formStr(data, "country", "India"),
    pincode: formStr(data, "pincode", "—"),
    mobile: formStr(data, "mobile", "—"),
    email: formStr(data, "email", "—"),
    bamsCollege: formStr(data, "bams_college", "—"),
    yearOfPassing: formInt(data, "year_of_passing", new Date().getFullYear()),
    currentDesignation: formStr(data, "current_designation", "—"),
    institutionName: formStr(data, "institution_name", "—"),
    registrationCouncil: formStr(data, "registration_council", "Not provided"),
    registrationNumber: formStr(data, "registration_number", "—"),
    yearsOfPractice: formInt(data, "years_of_practice", 0),
    viddhakarmaExperience: formStr(data, "viddhakarma_experience") || null,
    publicationsSummary: formStr(data, "publications_summary") || null,
    status: "SUBMITTED" as const,
    submittedAt: new Date(),
  };
}

function buildResearchProposalData(data: FormData) {
  const projectTitle = formStr(data, "project_title");
  if (!projectTitle) return null;

  const researchAreaLabel = formStr(data, "research_area", "Other");
  const researchArea = mapResearchArea(researchAreaLabel);

  return {
    projectTitle,
    researchArea,
    researchAreaOther: researchArea === "OTHER" ? researchAreaLabel : null,
    objectives: formStr(data, "objectives", "—"),
    methodology: formStr(data, "methodology", "—"),
    sampleSize: formStr(data, "sample_size", "As described in methodology"),
    studyDuration: formStr(data, "study_duration", "As per proposal"),
    expectedOutcomes: formStr(data, "expected_outcomes", formStr(data, "objectives", "—")),
    budgetSummary: formStr(data, "budget_summary", "To be reviewed"),
  };
}

async function attachResearchProposal(applicationId: string, data: FormData) {
  const proposalData = buildResearchProposalData(data);
  if (!proposalData) return;

  await prisma.researchProposal.upsert({
    where: { applicationId },
    update: proposalData,
    create: { applicationId, ...proposalData },
  });
}

export async function syncApplicationFromFormSubmission(
  userId: string,
  submissionId: string,
  data: FormData,
  existingApplicationId?: string | null
) {
  if (existingApplicationId) {
    const application = await prisma.application.update({
      where: { id: existingApplicationId, userId },
      data: {
        ...buildApplicationFields(data),
        statusHistory: {
          create: {
            fromStatus: "DRAFT",
            toStatus: "SUBMITTED",
            notes: "Application submitted via fellowship form",
          },
        },
      },
    });

    await attachResearchProposal(application.id, data);

    await prisma.formSubmission.update({
      where: { id: submissionId },
      data: { applicationId: application.id },
    });

    return application;
  }

  const applicationNumber = await generateApplicationNumber();
  const application = await prisma.application.create({
    data: {
      applicationNumber,
      userId,
      ...buildApplicationFields(data),
      statusHistory: {
        create: {
          toStatus: "SUBMITTED",
          notes: "Application submitted via fellowship form",
        },
      },
    },
  });

  await attachResearchProposal(application.id, data);

  await prisma.formSubmission.update({
    where: { id: submissionId },
    data: { applicationId: application.id },
  });

  return application;
}
