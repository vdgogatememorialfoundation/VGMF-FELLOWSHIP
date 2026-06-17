import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, generateApplicationNumber } from "@/lib/auth";
import { applicationSchema, researchProposalSchema, budgetSchema } from "@/lib/validations";
import { notifyApplicationSubmitted } from "@/lib/notifications";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: {
      researchProposal: true,
      budget: true,
      documents: true,
      statusHistory: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ applications });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { step, data, applicationId } = body;

    if (step === "personal") {
      const parsed = applicationSchema.safeParse(data);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
      }

      const d = parsed.data;
      const appData = {
        name: d.name,
        dob: new Date(d.dob),
        gender: d.gender,
        address: d.address,
        city: d.city,
        state: d.state,
        country: d.country,
        pincode: d.pincode,
        mobile: d.mobile,
        email: d.email,
        bamsCollege: d.bamsCollege,
        yearOfPassing: d.yearOfPassing,
        mdMsPhdDetails: d.mdMsPhdDetails,
        currentDesignation: d.currentDesignation,
        institutionName: d.institutionName,
        registrationCouncil: d.registrationCouncil,
        registrationNumber: d.registrationNumber,
        yearsOfPractice: d.yearsOfPractice,
        viddhakarmaExperience: d.viddhakarmaExperience,
        publicationsSummary: d.publicationsSummary,
      };

      if (applicationId) {
        const app = await prisma.application.update({
          where: { id: applicationId, userId: user.id },
          data: appData,
        });
        return NextResponse.json({ success: true, application: app });
      }

      const appNumber = await generateApplicationNumber();
      const app = await prisma.application.create({
        data: {
          applicationNumber: appNumber,
          userId: user.id,
          ...appData,
        },
      });
      return NextResponse.json({ success: true, application: app });
    }

    if (step === "research") {
      const parsed = researchProposalSchema.safeParse(data);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
      }

      const proposal = await prisma.researchProposal.upsert({
        where: { applicationId },
        update: parsed.data,
        create: { applicationId, ...parsed.data },
      });
      return NextResponse.json({ success: true, researchProposal: proposal });
    }

    if (step === "budget") {
      const parsed = budgetSchema.safeParse(data);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
      }

      const d = parsed.data;
      const total =
        d.equipment + d.consumables + d.travel + d.documentation + d.publication + d.other;

      const budget = await prisma.budget.upsert({
        where: { applicationId },
        update: { ...d, total },
        create: { applicationId, ...d, total },
      });
      return NextResponse.json({ success: true, budget });
    }

    if (step === "submit") {
      const app = await prisma.application.update({
        where: { id: applicationId, userId: user.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          statusHistory: {
            create: {
              fromStatus: "DRAFT",
              toStatus: "SUBMITTED",
              notes: "Application submitted by applicant",
            },
          },
        },
      });

      await notifyApplicationSubmitted(user.id, app.applicationNumber);
      return NextResponse.json({ success: true, application: app });
    }

    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  } catch (error) {
    console.error("Application error:", error);
    return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
  }
}
