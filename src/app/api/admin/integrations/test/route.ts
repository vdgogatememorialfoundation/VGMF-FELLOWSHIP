import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { sendWhatsAppMessageDetailed, sendWhatsAppOtp } from "@/lib/whatsapp";
import { isEmailConfigured, isWhatsAppConfigured } from "@/lib/integrations";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, target } = body as { type: "email" | "whatsapp"; target?: string };

  if (type === "email") {
    const email = target || user.email;
    if (!(await isEmailConfigured())) {
      return NextResponse.json(
        { error: "Email (ZeptoMail) is not configured. Add settings in Website Updates → API Integrations." },
        { status: 400 }
      );
    }

    const sent = await sendEmail({
      to: email,
      toName: user.name || "Admin",
      subject: "VGMF Portal — Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Test Email Successful</h2>
          <p>ZeptoMail integration is working correctly for the VGMF Fellowship Portal.</p>
          <p style="color: #666; font-size: 12px;">Sent at ${new Date().toISOString()}</p>
        </div>
      `,
      text: "ZeptoMail integration test successful.",
    });

    if (!sent.ok) {
      const message =
        sent.reason === "not_configured"
          ? "Email (ZeptoMail) is not configured."
          : sent.detail || "Failed to send test email";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Test email sent to ${email}` });
  }

  if (type === "whatsapp") {
    if (!target) {
      return NextResponse.json(
        { error: "Provide a phone number for the WhatsApp test." },
        { status: 400 }
      );
    }

    if (!(await isWhatsAppConfigured())) {
      return NextResponse.json(
        { error: "WhatsApp is not configured. Add settings in Website Updates → API Integrations." },
        { status: 400 }
      );
    }

    const sent = await sendWhatsAppMessageDetailed(
      target,
      "VGMF Fellowship Portal — WhatsApp integration test successful."
    );

    if (!sent.ok) {
      const otpTest = await sendWhatsAppOtp(target, "123456");
      if (!otpTest.ok) {
        return NextResponse.json(
          {
            error:
              sent.error ||
              otpTest.error ||
              "Failed to send WhatsApp test message. Verify token, Phone Number ID, and OTP template in API Settings.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `OTP template test sent to ${target} (code 123456). Plain text is blocked by Meta outside the 24-hour window.`,
      });
    }

    return NextResponse.json({ success: true, message: `Test message sent to ${target}` });
  }

  return NextResponse.json({ error: "Invalid test type" }, { status: 400 });
}
