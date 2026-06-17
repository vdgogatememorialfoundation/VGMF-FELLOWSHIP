import prisma from "./db";
import type { OtpPurpose } from "@prisma/client";
import { sendWhatsAppOtp } from "./whatsapp";

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createAndSendOtp(
  phone: string,
  purpose: OtpPurpose = "REGISTER"
): Promise<{ success: boolean; error?: string }> {
  const normalizedPhone = phone.replace(/\s/g, "");

  await prisma.otpCode.updateMany({
    where: { phone: normalizedPhone, purpose, verified: false },
    data: { verified: true },
  });

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: {
      phone: normalizedPhone,
      code,
      purpose,
      expiresAt,
    },
  });

  const sent = await sendWhatsAppOtp(normalizedPhone, code);

  if (!sent && process.env.NODE_ENV === "production") {
    return { success: false, error: "Failed to send OTP via WhatsApp" };
  }

  if (!sent && process.env.NODE_ENV !== "production") {
    console.log(`[DEV] OTP for ${normalizedPhone}: ${code}`);
    return { success: true };
  }

  return { success: true };
}

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: OtpPurpose = "REGISTER"
): Promise<{ valid: boolean; error?: string }> {
  const normalizedPhone = phone.replace(/\s/g, "");

  const otp = await prisma.otpCode.findFirst({
    where: {
      phone: normalizedPhone,
      purpose,
      verified: false,
    },
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

  if (otp.code !== code) {
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

export async function isPhoneOtpVerified(
  phone: string,
  purpose: OtpPurpose = "REGISTER"
): Promise<boolean> {
  const normalizedPhone = phone.replace(/\s/g, "");

  const otp = await prisma.otpCode.findFirst({
    where: {
      phone: normalizedPhone,
      purpose,
      verified: true,
      createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });

  return !!otp;
}
