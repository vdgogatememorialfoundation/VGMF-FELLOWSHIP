import prisma from "./db";
import type { z } from "zod";
import { adminUpdateApplicationSchema } from "./validations";
import { BUDGET_MAX } from "./utils";

type AdminUpdatePayload = Omit<
  z.infer<typeof adminUpdateApplicationSchema>,
  "applicationId"
>;

export async function updateApplicationByAdmin(
  applicationId: string,
  payload: AdminUpdatePayload,
  changedBy: string
) {
  const parsed = adminUpdateApplicationSchema.safeParse({ applicationId, ...payload });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid application data");
  }

  const { personal, notes, researchProposal, budget } = parsed.data;

  const existing = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { user: { include: { profile: true } }, budget: true },
  });

  if (!existing) {
    throw new Error("Application not found");
  }

  if (budget) {
    const keys = [
      "equipment",
      "consumables",
      "travel",
      "documentation",
      "publication",
      "other",
    ] as const;
    const merged = {
      equipment: budget.equipment ?? existing.budget?.equipment ?? 0,
      consumables: budget.consumables ?? existing.budget?.consumables ?? 0,
      travel: budget.travel ?? existing.budget?.travel ?? 0,
      documentation: budget.documentation ?? existing.budget?.documentation ?? 0,
      publication: budget.publication ?? existing.budget?.publication ?? 0,
      other: budget.other ?? existing.budget?.other ?? 0,
    };
    const total = keys.reduce((sum, key) => sum + merged[key], 0);
    if (total > BUDGET_MAX) {
      throw new Error(`Total budget cannot exceed ₹${BUDGET_MAX.toLocaleString("en-IN")}`);
    }
  }

  return prisma.$transaction(async (tx) => {
    if (personal && Object.keys(personal).length > 0) {
      const appUpdate: Record<string, unknown> = {};
      if (personal.name !== undefined) appUpdate.name = personal.name;
      if (personal.dob !== undefined) appUpdate.dob = new Date(personal.dob);
      if (personal.gender !== undefined) appUpdate.gender = personal.gender;
      if (personal.address !== undefined) appUpdate.address = personal.address;
      if (personal.city !== undefined) appUpdate.city = personal.city;
      if (personal.state !== undefined) appUpdate.state = personal.state;
      if (personal.country !== undefined) appUpdate.country = personal.country;
      if (personal.pincode !== undefined) appUpdate.pincode = personal.pincode;
      if (personal.mobile !== undefined) appUpdate.mobile = personal.mobile;
      if (personal.email !== undefined) appUpdate.email = personal.email;
      if (personal.bamsCollege !== undefined) appUpdate.bamsCollege = personal.bamsCollege;
      if (personal.yearOfPassing !== undefined) appUpdate.yearOfPassing = personal.yearOfPassing;
      if (personal.mdMsPhdDetails !== undefined) {
        appUpdate.mdMsPhdDetails = personal.mdMsPhdDetails || null;
      }
      if (personal.currentDesignation !== undefined) {
        appUpdate.currentDesignation = personal.currentDesignation;
      }
      if (personal.institutionName !== undefined) {
        appUpdate.institutionName = personal.institutionName;
      }
      if (personal.registrationCouncil !== undefined) {
        appUpdate.registrationCouncil = personal.registrationCouncil;
      }
      if (personal.registrationNumber !== undefined) {
        appUpdate.registrationNumber = personal.registrationNumber;
      }
      if (personal.yearsOfPractice !== undefined) {
        appUpdate.yearsOfPractice = personal.yearsOfPractice;
      }
      if (personal.viddhakarmaExperience !== undefined) {
        appUpdate.viddhakarmaExperience = personal.viddhakarmaExperience || null;
      }
      if (personal.publicationsSummary !== undefined) {
        appUpdate.publicationsSummary = personal.publicationsSummary || null;
      }

      if (Object.keys(appUpdate).length > 0) {
        await tx.application.update({
          where: { id: applicationId },
          data: appUpdate,
        });
      }

      if (personal.name) {
        await tx.profile.upsert({
          where: { userId: existing.userId },
          update: { name: personal.name },
          create: { userId: existing.userId, name: personal.name },
        });
      }

      const userUpdate: { email?: string; phone?: string } = {};
      if (personal.email) userUpdate.email = personal.email.toLowerCase();
      if (personal.mobile) userUpdate.phone = personal.mobile;
      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: existing.userId },
          data: userUpdate,
        });
      }
    }

    if (notes) {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          adminNotes: notes.adminNotes ?? undefined,
          verificationNotes: notes.verificationNotes ?? undefined,
          eligibilityNotes: notes.eligibilityNotes ?? undefined,
        },
      });
    }

    if (researchProposal && Object.keys(researchProposal).length > 0) {
      await tx.researchProposal.upsert({
        where: { applicationId },
        update: researchProposal,
        create: {
          applicationId,
          projectTitle: researchProposal.projectTitle ?? "Research Project",
          researchArea: researchProposal.researchArea ?? "OTHER",
          researchAreaOther: researchProposal.researchAreaOther ?? null,
          objectives: researchProposal.objectives ?? "—",
          methodology: researchProposal.methodology ?? "—",
          sampleSize: researchProposal.sampleSize ?? "—",
          studyDuration: researchProposal.studyDuration ?? "—",
          expectedOutcomes: researchProposal.expectedOutcomes ?? "—",
          budgetSummary: researchProposal.budgetSummary ?? "—",
        },
      });
    }

    if (budget && Object.keys(budget).length > 0) {
      const keys = [
        "equipment",
        "consumables",
        "travel",
        "documentation",
        "publication",
        "other",
      ] as const;
      const merged = {
        equipment: budget.equipment ?? existing.budget?.equipment ?? 0,
        consumables: budget.consumables ?? existing.budget?.consumables ?? 0,
        travel: budget.travel ?? existing.budget?.travel ?? 0,
        documentation: budget.documentation ?? existing.budget?.documentation ?? 0,
        publication: budget.publication ?? existing.budget?.publication ?? 0,
        other: budget.other ?? existing.budget?.other ?? 0,
      };
      const total = keys.reduce((sum, key) => sum + merged[key], 0);

      await tx.budget.upsert({
        where: { applicationId },
        update: { ...merged, total },
        create: { applicationId, ...merged, total },
      });
    }

    await tx.applicationStatusHistory.create({
      data: {
        applicationId,
        fromStatus: existing.status,
        toStatus: existing.status,
        changedBy,
        notes: "Application details updated by admin",
      },
    });

    return tx.application.findUnique({
      where: { id: applicationId },
      include: {
        user: { include: { profile: true } },
        researchProposal: true,
        budget: true,
        documents: true,
        fellowship: { include: { installments: true } },
        digitalUndertaking: { select: { id: true, submittedAt: true } },
      },
    });
  });
}
