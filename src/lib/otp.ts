import prisma from "./db";
import type { OtpPurpose } from "@prisma/client";
import { sendWhatsAppOtp } from "./whatsapp";
import { sendOtpEmail } from "./email";
import { isWhatsAppConfigured } from "./integrations";
import { normalizePhoneDigits } from "./phone";

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const VERIFICATION_WINDOW_MS = 30 * 60 * 1000;

export type OtpChannel = "phone" | "email";

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(phone: string): string {
  return normalizePhoneDigits(phone);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function invalidatePreviousOtps(
  where: { phone?: string; email?: string; purpose: OtpPurpose }
) {
  await prisma.otpCode.updateMany({
    where: { ...where, verified: false },
    data: { verified: true },
  });
}

async function storeOtp(
  data: { phone?: string; email?: string; purpose: OtpPurpose }
): Promise<string> {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: {
      phone: data.phone,
      email: data.email,
      code,
      purpose: data.purpose,
      expiresAt,
    },
  });

  return code;
}

function logDevOtp(target: string, code: string) {
  console.log(`[DEV] OTP for ${target}: ${code}`);
}

export async function createAndSendOtp(params: {
  channel: OtpChannel;
  phone?: string;
  email?: string;
  purpose?: OtpPurpose;
}): Promise<{ success: boolean; error?: string }> {
  const purpose = params.purpose ?? "REGISTER";

  if (params.channel === "phone") {
    if (!params.phone) {
      return { success: false, error: "Phone number is required" };
    }

    const normalizedPhone = normalizePhone(params.phone);
    await invalidatePreviousOtps({ phone: normalizedPhone, purpose });
    const code = await storeOtp({ phone: normalizedPhone, purpose });
    const result = await sendWhatsAppOtp(normalizedPhone, code);

    if (!result.ok) {
      await prisma.otpCode.deleteMany({
        where: { phone: normalizedPhone, purpose, code, verified: false },
      });

      const configured = await isWhatsAppConfigured();
      if (configured || process.env.NODE_ENV === "production") {
        console.error("WhatsApp OTP send failed:", result.error, "phone:", normalizedPhone);
        return {
          success: false,
          error:
            result.error ||
            "Failed to send OTP via WhatsApp. Check Admin → API Settings → Meta WhatsApp and OTP template vgmf_otp_auth.",
        };
      }
      logDevOtp(normalizedPhone, code);
    } else if (result.messageId) {
      console.log("WhatsApp OTP accepted by Meta:", result.messageId, "phone:", normalizedPhone);
    }

    return { success: true };
  }

  if (!params.email) {
    return { success: false, error: "Email address is required" };
  }

  const normalizedEmail = normalizeEmail(params.email);
  await invalidatePreviousOtps({ email: normalizedEmail, purpose });
  const code = await storeOtp({ email: normalizedEmail, purpose });
  const result = await sendOtpEmail(normalizedEmail, code);

  if (!result.ok) {
    await prisma.otpCode.deleteMany({
      where: { email: normalizedEmail, purpose, code, verified: false },
    });
  }

  if (!result.ok && process.env.NODE_ENV === "production") {
    if (result.reason === "not_configured") {
      return {
        success: false,
        error:
          "Email OTP is not available right now. The administrator must configure ZeptoMail in Admin → Website Updates → API Settings.",
      };
    }

    return {
      success: false,
      error: result.detail
        ? `Failed to send OTP via email: ${result.detail}`
        : "Failed to send OTP via email. Please try again in a few minutes.",
    };
  }

  if (!result.ok) {
    logDevOtp(normalizedEmail, code);
  }

  return { success: true };
}

export async function verifyOtp(params: {
  channel: OtpChannel;
  phone?: string;
  email?: string;
  code: string;
  purpose?: OtpPurpose;
}): Promise<{ valid: boolean; error?: string }> {
  const purpose = params.purpose ?? "REGISTER";

  const where =
    params.channel === "phone"
      ? { phone: normalizePhone(params.phone || ""), purpose, verified: false }
      : { email: normalizeEmail(params.email || ""), purpose, verified: false };

  const otp = await prisma.otpCode.findFirst({
    where,
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return { valid: false, error: "No OTP found. Please request a new one." };
  }

  if (otp.expiresAt < new Date()) {
    return { valid: false, error: "OTP has expired. Please request a new one." };
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    return { valid: false, error: "Too many attempts. Please request a new OTP." };
  }

  if (otp.code !== params.code) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { valid: false, error: "Invalid OTP. Please try again." };
  }

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { verified: true },
  });

  return { valid: true };
}

async function isOtpVerified(
  where: { phone?: string; email?: string; purpose: OtpPurpose }
): Promise<boolean> {
  const otp = await prisma.otpCode.findFirst({
    where: {
      ...where,
      verified: true,
      createdAt: { gte: new Date(Date.now() - VERIFICATION_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
  });

  return !!otp;
}

export async function isPhoneOtpVerified(
  phone: string,
  purpose: OtpPurpose = "REGISTER"
): Promise<boolean> {
  return isOtpVerified({ phone: normalizePhone(phone), purpose });
}

export async function isEmailOtpVerified(
  email: string,
  purpose: OtpPurpose = "REGISTER"
): Promise<boolean> {
  return isOtpVerified({ email: normalizeEmail(email), purpose });
}
