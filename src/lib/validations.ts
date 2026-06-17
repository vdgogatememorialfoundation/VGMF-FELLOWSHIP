import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 digits").optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

export const profileSchema = z.object({
  name: z.string().min(2),
  dob: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
});

export const applicationSchema = z.object({
  name: z.string().min(2),
  dob: z.string(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().default("India"),
  pincode: z.string().min(6),
  mobile: z.string().min(10),
  email: z.string().email(),
  bamsCollege: z.string().min(2),
  yearOfPassing: z.coerce.number().min(1970).max(new Date().getFullYear()),
  mdMsPhdDetails: z.string().optional(),
  currentDesignation: z.string().min(2),
  institutionName: z.string().min(2),
  registrationCouncil: z.string().min(2),
  registrationNumber: z.string().min(2),
  yearsOfPractice: z.coerce.number().min(0),
  viddhakarmaExperience: z.string().optional(),
  publicationsSummary: z.string().optional(),
});

export const researchProposalSchema = z.object({
  projectTitle: z.string().min(5),
  researchArea: z.enum([
    "MUSCULOSKELETAL_DISORDERS",
    "PAIN_MANAGEMENT",
    "NEUROLOGICAL_DISORDERS",
    "COMPARATIVE_STUDIES",
    "MECHANISM_BASED_RESEARCH",
    "CLASSICAL_DOCUMENTATION",
    "PROTOCOL_DEVELOPMENT",
    "OTHER",
  ]),
  researchAreaOther: z.string().optional(),
  objectives: z.string().min(20),
  methodology: z.string().min(20),
  sampleSize: z.string().min(1),
  studyDuration: z.string().min(1),
  expectedOutcomes: z.string().min(20),
  budgetSummary: z.string().min(10),
});

export const budgetSchema = z.object({
  equipment: z.coerce.number().min(0),
  consumables: z.coerce.number().min(0),
  travel: z.coerce.number().min(0),
  documentation: z.coerce.number().min(0),
  publication: z.coerce.number().min(0),
  other: z.coerce.number().min(0),
}).refine(
  (data) => {
    const total =
      data.equipment +
      data.consumables +
      data.travel +
      data.documentation +
      data.publication +
      data.other;
    return total <= 75000;
  },
  { message: "Total budget cannot exceed ₹75,000" }
);

export const supportSchema = z.object({
  subject: z.string().min(5),
  message: z.string().min(20),
});

export const scoreSchema = z.object({
  scientificMerit: z.coerce.number().min(0).max(25),
  innovation: z.coerce.number().min(0).max(20),
  feasibility: z.coerce.number().min(0).max(20),
  budgetJustification: z.coerce.number().min(0).max(15),
  viddhakarmaRelevance: z.coerce.number().min(0).max(20),
  remarks: z.string().optional(),
  isShortlisted: z.boolean().optional(),
});

export const interviewSchema = z.object({
  scheduledDate: z.string(),
  scheduledTime: z.string(),
  meetingLink: z.string().url(),
  panelMembers: z.string().min(5),
  notes: z.string().optional(),
});
