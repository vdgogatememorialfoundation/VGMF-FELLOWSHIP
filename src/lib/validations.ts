import { z } from "zod";
import { isValidIndianMobile } from "./phone";

const LOGIN_USER_ID_PATTERN = /^VGMF-\d{4}-\d+$/i;

function isLoginPhoneIdentifier(value: string | undefined): boolean {
  const trimmed = value?.trim() || "";
  if (!trimmed) return false;
  if (trimmed.includes("@")) {
    return z.string().email().safeParse(trimmed).success;
  }
  if (LOGIN_USER_ID_PATTERN.test(trimmed)) return true;
  return isValidIndianMobile(trimmed);
}

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone must be at least 10 digits"),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    otp: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== undefined && data.password.length > 0 && data.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 8 characters",
        path: ["password"],
      });
    }

    if (
      data.password !== undefined &&
      data.confirmPassword !== undefined &&
      data.password !== data.confirmPassword
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

const otpPurposeSchema = z.enum(["REGISTER", "LOGIN", "RESET_PASSWORD"]).default("REGISTER");

export const sendOtpSchema = z
  .object({
    channel: z.enum(["phone", "email"]),
    phone: z.string().optional(),
    email: z.string().email("Invalid email address").optional(),
    purpose: otpPurposeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.channel === "phone") {
      const phone = data.phone?.trim() || "";
      const valid =
        data.purpose === "LOGIN"
          ? isLoginPhoneIdentifier(phone)
          : isValidIndianMobile(phone);

      if (!valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            data.purpose === "LOGIN"
              ? "Enter your mobile number, email, or VGMF user ID"
              : "Enter a valid 10-digit mobile number",
          path: ["phone"],
        });
      }
      return;
    }

    if (!data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valid email address required",
        path: ["email"],
      });
    }
  });

export const verifyOtpSchema = z
  .object({
    channel: z.enum(["phone", "email"]),
    phone: z.string().optional(),
    email: z.string().email("Invalid email address").optional(),
    code: z.string().length(6, "OTP must be 6 digits"),
    purpose: otpPurposeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.channel === "phone") {
      const phone = data.phone?.trim() || "";
      const valid =
        data.purpose === "LOGIN"
          ? isLoginPhoneIdentifier(phone)
          : isValidIndianMobile(phone);

      if (!valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            data.purpose === "LOGIN"
              ? "Enter your mobile number, email, or VGMF user ID"
              : "Enter a valid 10-digit mobile number",
          path: ["phone"],
        });
      }
      return;
    }

    if (!data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valid email address required",
        path: ["email"],
      });
    }
  });

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
  portal: z.enum(["applicant", "admin", "staff", "reviewer", "trustee"]).optional(),
});

export const loginOtpSchema = z
  .object({
    channel: z.enum(["phone", "email"]),
    phone: z.string().optional(),
    email: z.string().email("Invalid email address").optional(),
    code: z.string().length(6, "OTP must be 6 digits"),
    portal: z.enum(["applicant", "admin", "staff", "reviewer", "trustee"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.channel === "phone") {
      if (!isLoginPhoneIdentifier(data.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter your mobile number, email, or VGMF user ID",
          path: ["phone"],
        });
      }
      return;
    }

    if (!data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valid email address required",
        path: ["email"],
      });
    }
  });

const passwordFields = {
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
};

export const adminCreateApplicantSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone must be at least 10 digits").optional().or(z.literal("")),
    ...passwordFields,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const adminCreateUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone must be at least 10 digits").optional().or(z.literal("")),
    role: z.enum(["ADMIN", "STAFF", "FINANCE", "COMMITTEE", "TRUSTEE"]),
    ...passwordFields,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const adminUpdateUserSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
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

export const adminUpdateApplicationSchema = z.object({
  applicationId: z.string().min(1),
  personal: applicationSchema.partial().optional(),
  notes: z
    .object({
      adminNotes: z.string().nullable().optional(),
      verificationNotes: z.string().nullable().optional(),
      eligibilityNotes: z.string().nullable().optional(),
    })
    .optional(),
  researchProposal: researchProposalSchema.partial().optional(),
  budget: z
    .object({
      equipment: z.coerce.number().min(0).optional(),
      consumables: z.coerce.number().min(0).optional(),
      travel: z.coerce.number().min(0).optional(),
      documentation: z.coerce.number().min(0).optional(),
      publication: z.coerce.number().min(0).optional(),
      other: z.coerce.number().min(0).optional(),
    })
    .optional(),
});

export const supportSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(20, "Message must be at least 20 characters"),
});

export const supportReplySchema = z.object({
  body: z.string().min(3, "Reply must be at least 3 characters"),
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
