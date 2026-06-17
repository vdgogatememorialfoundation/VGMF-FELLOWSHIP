import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PAGES = [
  {
    slug: "ABOUT" as const,
    title: "About Us",
    content: `The Vaidya Gogate Memorial Foundation is dedicated to advancing Ayurvedic research and Viddhakarma studies.

Our Fellowship Programme 2026 supports qualified BAMS practitioners and researchers in conducting evidence-based clinical research, protocol development, and classical documentation.

We provide grants up to ₹75,000 for approved research proposals, along with mentorship, quarterly progress tracking, and completion certification.`,
  },
  {
    slug: "TERMS" as const,
    title: "Terms & Conditions",
    content: `1. Applicants must be registered BAMS practitioners with valid registration.
2. All information submitted must be accurate and verifiable.
3. Fellowship grants are subject to approval by the Review Committee and Trustees.
4. Selected fellows must submit quarterly progress reports.
5. Misuse of fellowship funds will result in termination and recovery of disbursed amounts.
6. The Foundation reserves the right to modify programme terms with prior notice.`,
  },
  {
    slug: "PRIVACY" as const,
    title: "Privacy Policy",
    content: `We collect personal and professional information solely for fellowship application processing.

Your data is stored securely and used only for:
- Application review and evaluation
- Communication regarding your application status
- Fellowship administration and reporting

We do not sell or share your personal data with third parties except as required by law.`,
  },
  {
    slug: "REFUND" as const,
    title: "Refund Policy",
    content: `Fellowship grants are disbursed in installments (40%, 40%, 20%) based on progress milestones.

Refund of disbursed amounts may be required if:
- Research is not conducted as per approved proposal
- Funds are misused or unaccounted for
- Fellow withdraws from the programme without valid reason

Application fees, if applicable, are non-refundable.`,
  },
];

const DEFAULT_FIELDS = [
  { section: "Personal Details", label: "Full Name", fieldKey: "name", fieldType: "TEXT" as const, required: true, order: 1 },
  { section: "Personal Details", label: "Date of Birth", fieldKey: "dob", fieldType: "DATE" as const, required: true, order: 2 },
  { section: "Personal Details", label: "Gender", fieldKey: "gender", fieldType: "SELECT" as const, required: true, order: 3, options: '["Male","Female","Other"]' },
  { section: "Personal Details", label: "Email", fieldKey: "email", fieldType: "EMAIL" as const, required: true, order: 4 },
  { section: "Personal Details", label: "Mobile", fieldKey: "mobile", fieldType: "PHONE" as const, required: true, order: 5 },
  { section: "Personal Details", label: "Address", fieldKey: "address", fieldType: "TEXTAREA" as const, required: true, order: 6 },
  { section: "Personal Details", label: "City", fieldKey: "city", fieldType: "TEXT" as const, required: true, order: 7 },
  { section: "Personal Details", label: "State", fieldKey: "state", fieldType: "TEXT" as const, required: true, order: 8 },
  { section: "Personal Details", label: "Pincode", fieldKey: "pincode", fieldType: "TEXT" as const, required: true, order: 9 },
  { section: "Professional Details", label: "BAMS College", fieldKey: "bams_college", fieldType: "TEXT" as const, required: true, order: 10 },
  { section: "Professional Details", label: "Year of Passing", fieldKey: "year_of_passing", fieldType: "NUMBER" as const, required: true, order: 11 },
  { section: "Professional Details", label: "Current Designation", fieldKey: "current_designation", fieldType: "TEXT" as const, required: true, order: 12 },
  { section: "Professional Details", label: "Institution/Clinic Name", fieldKey: "institution_name", fieldType: "TEXT" as const, required: true, order: 13 },
  { section: "Professional Details", label: "Registration Number", fieldKey: "registration_number", fieldType: "TEXT" as const, required: true, order: 14 },
  { section: "Professional Details", label: "Years of Clinical Practice", fieldKey: "years_of_practice", fieldType: "NUMBER" as const, required: true, order: 15 },
  { section: "Research Proposal", label: "Project Title", fieldKey: "project_title", fieldType: "TEXT" as const, required: true, order: 16 },
  { section: "Research Proposal", label: "Research Area", fieldKey: "research_area", fieldType: "SELECT" as const, required: true, order: 17, options: '["Musculoskeletal Disorders","Pain Management","Neurological Disorders","Other"]' },
  { section: "Research Proposal", label: "Research Objectives", fieldKey: "objectives", fieldType: "TEXTAREA" as const, required: true, order: 18 },
  { section: "Research Proposal", label: "Methodology", fieldKey: "methodology", fieldType: "TEXTAREA" as const, required: true, order: 19 },
];

async function main() {
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      siteName: "Vaidya Gogate Memorial Foundation Fellowship Portal 2026",
      siteTagline: "Advancing Ayurvedic Research & Viddhakarma Studies",
      tickerText: "VGMF Fellowship 2026 — Applications Now Open | Visit Notices for important updates",
      tickerEnabled: true,
      heroTitle: "Vaidya Gogate Memorial Foundation Research Fellowship 2026",
      heroSubtitle: "Apply for research fellowships in Ayurvedic medicine with grants up to ₹75,000.",
      footerText: "© 2026 Vaidya Gogate Memorial Foundation. All rights reserved.",
      contactEmail: "info@vaidyagogate.org",
    },
  });

  for (const page of DEFAULT_PAGES) {
    await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    });
  }

  const template = await prisma.formTemplate.upsert({
    where: { slug: "fellowship-application" },
    update: {},
    create: {
      name: "Fellowship Application Form 2026",
      slug: "fellowship-application",
      description: "Main fellowship application form",
      isActive: true,
    },
  });

  for (const field of DEFAULT_FIELDS) {
    await prisma.formField.upsert({
      where: {
        formTemplateId_fieldKey: {
          formTemplateId: template.id,
          fieldKey: field.fieldKey,
        },
      },
      update: {},
      create: { formTemplateId: template.id, ...field },
    });
  }

  const existingNotice = await prisma.notice.findFirst({
    where: { title: "Fellowship Applications Open for 2026" },
  });
  if (!existingNotice) {
    await prisma.notice.create({
      data: {
        title: "Fellowship Applications Open for 2026",
        content:
          "Applications for the Vaidya Gogate Memorial Foundation Research Fellowship 2026 are now open. Register on the portal and complete your application before the deadline.",
        isActive: true,
        priority: 10,
      },
    });
  }

  console.log("CMS seed completed");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
