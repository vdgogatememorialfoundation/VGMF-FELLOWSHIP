import prisma from "./db";
import type { ApplicationStatus, Gender, ResearchArea } from "@prisma/client";
import { generateApplicationNumber } from "./application-number";
import { isCheckboxAccepted } from "./form-validation";

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
    "COMPARATIVE STUDIES": "COMPARATIVE_STUDIES",
    "MECHANISM BASED RESEARCH": "MECHANISM_BASED_RESEARCH",
    "MECHANISM-BASED RESEARCH": "MECHANISM_BASED_RESEARCH",
    "CLASSICAL DOCUMENTATION": "CLASSICAL_DOCUMENTATION",
    "PROTOCOL DEVELOPMENT": "PROTOCOL_DEVELOPMENT",
    "STANDARDIZATION AND PROTOCOL DEVELOPMENT": "PROTOCOL_DEVELOPMENT",
    OTHER: "OTHER",
  };
  return map[value.trim().toUpperCase()] ?? "OTHER";
}

function buildApplicationFields(data: FormData, status: ApplicationStatus) {
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
    registrationCouncil: formStr(data, "registration_council", "NCISM"),
    registrationNumber: formStr(data, "registration_number", "—"),
    yearsOfPractice: formInt(data, "years_of_practice", 0),
    viddhakarmaExperience: formStr(data, "viddhakarma_experience") || null,
    publicationsSummary: formStr(data, "publications_summary") || null,
    termsAcceptedAt: isCheckboxAccepted(data.terms_accepted) ? new Date() : null,
    undertakingAcceptedAt: isCheckboxAccepted(data.undertaking_accepted)
      ? new Date()
      : null,
    status,
    submittedAt: status !== "DRAFT" ? new Date() : null,
  };
}

async function attachBudget(applicationId: string, data: FormData) {
  const keys = [
    "equipment",
    "consumables",
    "travel",
    "documentation",
    "publication",
    "other",
  ] as const;
  const budgetData: Record<string, number> = {};
  let total = 0;

  for (const key of keys) {
    const val = formInt(data, key, 0);
    budgetData[key] = val;
    total += val;
  }

  if (total <= 0) return;

  await prisma.budget.upsert({
    where: { applicationId },
    update: { ...budgetData, total },
    create: { applicationId, ...budgetData, total },
  });
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

export async function ensureDraftApplication(
  userId: string,
  submissionId: string,
  data: FormData,
  existingApplicationId?: string | null
) {
  const fields = buildApplicationFields(data, "DRAFT");

  if (existingApplicationId) {
    const application = await prisma.application.update({
      where: { id: existingApplicationId, userId },
      data: fields,
    });

    await attachResearchProposal(application.id, data);
    await attachBudget(application.id, data);

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
      ...fields,
      statusHistory: {
        create: {
          toStatus: "DRAFT",
          notes: "Application draft saved via fellowship form",
        },
      },
    },
  });

  await attachResearchProposal(application.id, data);
  await attachBudget(application.id, data);

  await prisma.formSubmission.update({
    where: { id: submissionId },
    data: { applicationId: application.id },
  });

  return application;
}

export async function syncApplicationFromFormSubmission(
  userId: string,
  submissionId: string,
  data: FormData,
  existingApplicationId?: string | null
) {
  const fields = buildApplicationFields(data, "SCRUTINY");

  if (existingApplicationId) {
    const existing = await prisma.application.findUnique({
      where: { id: existingApplicationId, userId },
    });

    const application = await prisma.application.update({
      where: { id: existingApplicationId, userId },
      data: {
        ...fields,
        status: "SCRUTINY",
        statusHistory: {
          createMany: {
            data: [
              {
                fromStatus: existing?.status ?? "DRAFT",
                toStatus: "SUBMITTED",
                notes: "Application submitted via fellowship form",
              },
              {
                fromStatus: "SUBMITTED",
                toStatus: "SCRUTINY",
                notes: "Queued for administrative scrutiny and document verification",
              },
            ],
          },
        },
      },
    });

    await attachResearchProposal(application.id, data);
    await attachBudget(application.id, data);

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
      ...fields,
      status: "SCRUTINY",
      statusHistory: {
        createMany: {
          data: [
            {
              toStatus: "SUBMITTED",
              notes: "Application submitted via fellowship form",
            },
            {
              fromStatus: "SUBMITTED",
              toStatus: "SCRUTINY",
              notes: "Queued for administrative scrutiny and document verification",
            },
          ],
        },
      },
    },
  });

  await attachResearchProposal(application.id, data);
  await attachBudget(application.id, data);

  await prisma.formSubmission.update({
    where: { id: submissionId },
    data: { applicationId: application.id },
  });

  return application;
}

export async function deleteApplicationByAdmin(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      fellowship: {
        include: { installments: true },
      },
    },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  const hasReleasedFunds = application.fellowship?.installments.some(
    (installment) => installment.status === "RELEASED"
  );

  if (hasReleasedFunds) {
    throw new Error(
      "Cannot delete this application because fellowship funds have already been released."
    );
  }

  await prisma.$transaction(async (tx) => {
    if (application.fellowship) {
      await tx.fellowship.delete({ where: { id: application.fellowship.id } });
    }
    await tx.application.delete({ where: { id: applicationId } });
  });

  return {
    applicationNumber: application.applicationNumber,
    userId: application.userId,
  };
}
