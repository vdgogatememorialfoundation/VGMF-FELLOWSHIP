import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateUserId } from "../src/lib/numeric-id";
import {
  DEFAULT_NAV_LINKS,
  DEFAULT_FOOTER_QUICK_LINKS,
  DEFAULT_FOOTER_LEGAL_LINKS,
  DEFAULT_HERO_STATS,
  DEFAULT_HERO_SNAPSHOT,
  DEFAULT_HIGHLIGHTS,
  DEFAULT_JOURNEY_STEPS,
  DEFAULT_FAQ_ITEMS,
} from "../src/lib/site-content";
import { RULEBOOK_TITLE, RULEBOOK_CONTENT } from "../src/lib/rulebook-content";

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

async function seedAdmin() {
  const adminPassword = "Admin@2026";
  const passwordHash = await hashPassword(adminPassword);

  const existing = await prisma.user.findUnique({
    where: { email: "admin@vaidyagogate.org" },
  });

  const adminUserId = existing?.userId ?? (await generateUserId());

  const admin = await prisma.user.upsert({
    where: { email: "admin@vaidyagogate.org" },
    update: {
      role: "ADMIN",
      isActive: true,
    },
    create: {
      userId: adminUserId,
      email: "admin@vaidyagogate.org",
      passwordHash,
      adminPassword,
      role: "ADMIN",
      profile: { create: { name: "VGMF Admin" } },
    },
  });

  await prisma.profile.upsert({
    where: { userId: admin.id },
    update: { name: "VGMF Admin" },
    create: { userId: admin.id, name: "VGMF Admin" },
  });

  console.log("Admin user ready: admin@vaidyagogate.org");
}

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
    content: `1. Applicants must be registered BAMS practitioners with valid NCISM registration.
2. All information submitted must be accurate and verifiable.
3. Fellowship grants are subject to approval by the Review Committee and Trustees.
4. Selected fellows must submit quarterly progress reports.
5. Misuse of fellowship funds will result in termination and recovery of disbursed amounts.
6. The Foundation reserves the right to modify programme terms with prior notice.
7. By submitting this application, you agree to these Terms & Conditions.`,
  },
  {
    slug: "UNDERTAKING" as const,
    title: "Applicant Undertaking",
    content: `I hereby undertake that:

1. I am a registered Ayurvedic practitioner with a valid NCISM registration number.
2. All particulars and documents submitted in my fellowship application are true and correct to the best of my knowledge.
3. I will conduct the proposed research ethically and in accordance with approved protocols.
4. I will utilize fellowship funds solely for the approved research purpose and maintain proper accounts.
5. I will submit quarterly progress reports and final completion report as required by the Foundation.
6. I understand that any false statement or misuse of funds may lead to rejection, termination, or recovery of disbursed amounts.
7. I agree to abide by all decisions of the Review Committee and Trustees of the Vaidya Gogate Memorial Foundation.`,
  },
  {
    slug: "RULEBOOK" as const,
    title: RULEBOOK_TITLE,
    content: RULEBOOK_CONTENT,
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
  { section: "Personal Details", label: "Pincode", fieldKey: "pincode", fieldType: "TEXT" as const, required: true, order: 7, helpText: "Enter 6-digit pincode — city, state and country will be filled automatically" },
  { section: "Personal Details", label: "City", fieldKey: "city", fieldType: "TEXT" as const, required: true, order: 8 },
  { section: "Personal Details", label: "State", fieldKey: "state", fieldType: "TEXT" as const, required: true, order: 9 },
  { section: "Personal Details", label: "Country", fieldKey: "country", fieldType: "TEXT" as const, required: true, order: 10, placeholder: "India" },
  { section: "Professional Details", label: "BAMS College", fieldKey: "bams_college", fieldType: "TEXT" as const, required: true, order: 11 },
  { section: "Professional Details", label: "Year of Passing", fieldKey: "year_of_passing", fieldType: "NUMBER" as const, required: true, order: 12 },
  { section: "Professional Details", label: "Current Designation", fieldKey: "current_designation", fieldType: "TEXT" as const, required: true, order: 13 },
  { section: "Professional Details", label: "Institution/Clinic Name", fieldKey: "institution_name", fieldType: "TEXT" as const, required: true, order: 14 },
  { section: "Professional Details", label: "Registration Council", fieldKey: "registration_council", fieldType: "SELECT" as const, required: true, order: 15, options: '["NCISM"]' },
  { section: "Professional Details", label: "NCISM Registration Number", fieldKey: "registration_number", fieldType: "TEXT" as const, required: true, order: 16, helpText: "Your NCISM registration number as on the certificate" },
  { section: "Professional Details", label: "NCISM Registration Certificate", fieldKey: "ncism_registration_certificate", fieldType: "FILE" as const, required: true, order: 17, helpText: "Upload NCISM registration certificate (PDF or image, max 5 MB) to verify you are a registered doctor" },
  { section: "Professional Details", label: "Years of Clinical Practice", fieldKey: "years_of_practice", fieldType: "NUMBER" as const, required: true, order: 18 },
  { section: "Professional Details", label: "Viddhakarma Clinical Experience", fieldKey: "viddhakarma_experience", fieldType: "TEXTAREA" as const, required: true, order: 19, helpText: "Describe your clinical experience in Viddhakarma procedures" },
  { section: "Professional Details", label: "Publications Summary", fieldKey: "publications_summary", fieldType: "TEXTAREA" as const, required: false, order: 20 },
  { section: "Professional Details", label: "Higher Qualification (MD/MS/PhD)", fieldKey: "higher_qualification", fieldType: "TEXT" as const, required: false, order: 21, helpText: "MD/MS (Ayurveda) or PhD — preferred but not mandatory" },
  { section: "Research Proposal", label: "Project Title", fieldKey: "project_title", fieldType: "TEXT" as const, required: true, order: 22 },
  { section: "Research Proposal", label: "Research Area", fieldKey: "research_area", fieldType: "SELECT" as const, required: true, order: 23, options: '["Musculoskeletal Disorders","Pain Management","Neurological Disorders","Comparative Studies","Mechanism Based Research","Classical Documentation","Protocol Development","Other"]' },
  { section: "Research Proposal", label: "Research Objectives", fieldKey: "objectives", fieldType: "TEXTAREA" as const, required: true, order: 24 },
  { section: "Research Proposal", label: "Methodology", fieldKey: "methodology", fieldType: "TEXTAREA" as const, required: true, order: 25 },
  { section: "Research Proposal", label: "Sample Size", fieldKey: "sample_size", fieldType: "TEXT" as const, required: true, order: 26 },
  { section: "Research Proposal", label: "Study Duration", fieldKey: "study_duration", fieldType: "SELECT" as const, required: true, order: 27, options: '["6 months","12 months","6-12 months"]' },
  { section: "Research Proposal", label: "Expected Outcomes", fieldKey: "expected_outcomes", fieldType: "TEXTAREA" as const, required: true, order: 28 },
  { section: "Budget Plan", label: "Equipment (₹)", fieldKey: "equipment", fieldType: "NUMBER" as const, required: true, order: 30, helpText: "Total budget must not exceed ₹75,000" },
  { section: "Budget Plan", label: "Consumables (₹)", fieldKey: "consumables", fieldType: "NUMBER" as const, required: false, order: 31 },
  { section: "Budget Plan", label: "Travel (₹)", fieldKey: "travel", fieldType: "NUMBER" as const, required: false, order: 32 },
  { section: "Budget Plan", label: "Documentation (₹)", fieldKey: "documentation", fieldType: "NUMBER" as const, required: false, order: 33 },
  { section: "Budget Plan", label: "Publication (₹)", fieldKey: "publication", fieldType: "NUMBER" as const, required: false, order: 34 },
  { section: "Budget Plan", label: "Other (₹)", fieldKey: "other", fieldType: "NUMBER" as const, required: false, order: 35 },
  { section: "Mandatory Documents", label: "Curriculum Vitae (CV)", fieldKey: "cv_upload", fieldType: "FILE" as const, required: true, order: 40, helpText: "Upload CV as PDF (max 5 MB)" },
  { section: "Mandatory Documents", label: "Research Proposal PDF", fieldKey: "research_proposal_pdf", fieldType: "FILE" as const, required: true, order: 42 },
  { section: "Mandatory Documents", label: "Budget Proposal PDF", fieldKey: "budget_proposal_pdf", fieldType: "FILE" as const, required: true, order: 43 },
  { section: "Mandatory Documents", label: "Timeline of Study PDF", fieldKey: "timeline_pdf", fieldType: "FILE" as const, required: true, order: 44 },
  { section: "Mandatory Documents", label: "Ethical Clearance (if applicable)", fieldKey: "ethical_clearance", fieldType: "FILE" as const, required: false, order: 45 },
  { section: "Declarations", label: "Terms & Conditions", fieldKey: "terms_accepted", fieldType: "CHECKBOX" as const, required: true, order: 97 },
  { section: "Declarations", label: "Fellowship Rulebook", fieldKey: "rulebook_accepted", fieldType: "CHECKBOX" as const, required: true, order: 98 },
];

async function main() {
  await seedAdmin();

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      siteName: "Vaidya Gogate Memorial Foundation Fellowship Portal 2026",
      siteTagline: "Advancing Ayurvedic Research & Viddhakarma Studies",
      headerOrgName: "Vaidya Gogate Memorial Foundation",
      utilityBarText: "Fellowship 2026",
      tickerText: "VGMF Fellowship 2026 — Applications Now Open | Visit Notices for important updates",
      tickerEnabled: true,
      heroTitle: "Vaidya Gogate Memorial Foundation Research Fellowship 2026",
      heroSubtitle: "Apply for research fellowships in Ayurvedic medicine with grants up to ₹75,000.",
      heroBadge: "Fellowship 2026 · Applications Open",
      heroStats: DEFAULT_HERO_STATS,
      heroSnapshot: DEFAULT_HERO_SNAPSHOT,
      highlightsTitle: "Programme highlights",
      highlightsSubtitle:
        "Clinical research, mentorship, and structured funding — designed like our national seminar experience.",
      highlights: DEFAULT_HIGHLIGHTS,
      journeyTitle: "Your application journey",
      journeySubtitle: "3 simple steps",
      journeySteps: DEFAULT_JOURNEY_STEPS,
      aboutBadge: "Since 1972",
      aboutTitle: "About the foundation",
      aboutContent:
        "The Vaidya Gogate Memorial Foundation advances Ayurvedic education and research. The 2026 Fellowship empowers practitioners to contribute meaningful work in Viddhakarma and allied sciences.",
      aboutCtaLabel: "Learn more",
      aboutCtaHref: "/about",
      faqTitle: "Frequently asked questions",
      faqSubtitle: "Registration, applications, grants, and tracking — answered.",
      faqItems: DEFAULT_FAQ_ITEMS,
      navLinks: DEFAULT_NAV_LINKS,
      footerQuickLinks: DEFAULT_FOOTER_QUICK_LINKS,
      footerLegalLinks: DEFAULT_FOOTER_LEGAL_LINKS,
      footerAboutText: "Advancing Ayurveda since 1972",
      footerDeveloperCredit:
        "Developed by Capture Visual Studios · Vaidya Gogate Memorial Foundation Copyrights",
      footerText: "© 2026 Vaidya Gogate Memorial Foundation. All rights reserved.",
      contactEmail: "info@vaidyagogate.org",
      contactPhone: "+91 9876543210",
      contactAddress: "Vaidya Gogate Memorial Foundation, India",
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
      update: {
        section: field.section,
        label: field.label,
        fieldType: field.fieldType,
        required: field.required,
        order: field.order,
        helpText: "helpText" in field ? field.helpText : undefined,
        placeholder: "placeholder" in field ? field.placeholder : undefined,
        options: "options" in field ? field.options : undefined,
      },
      create: { formTemplateId: template.id, ...field },
    });
  }

  await prisma.formField.updateMany({
    where: {
      formTemplateId: template.id,
      fieldKey: "registration_certificate_upload",
    },
    data: {
      isActive: false,
      required: false,
    },
  });

  const existingNotice = await prisma.notice.findFirst({
    where: { title: "Fellowship Applications Open for 2026" },
  });
  if (!existingNotice) {
    await prisma.notice.create({
      data: {
        title: "Fellowship Applications Open for 2026",
        content:
          "Applications for the Vaidya Gogate Memorial Foundation Research Fellowship 2026 are now open. Register and complete your application before the deadline.",
        category: "EVENT",
        linkUrl: "/register",
        linkLabel: "Apply now",
        isActive: true,
        priority: 10,
      },
    });
  }

  console.log("CMS seed completed");

  await prisma.formField.updateMany({
    where: { fieldKey: "undertaking_accepted" },
    data: { isActive: false },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
