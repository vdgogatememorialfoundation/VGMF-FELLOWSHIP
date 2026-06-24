import PDFDocument from "pdfkit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import {
  applyPdfLetterheadLayout,
  loadPdfLetterheadBranding,
  PDF_PAGE_MARGIN,
  PDF_CONTENT_TOP,
  stampPdfLetterheadOnAllPages,
} from "./pdf-letterhead";

function ensurePdfkitFonts() {
  const fontDir = path.join(process.cwd(), "node_modules", "pdfkit", "js", "data");
  if (existsSync(fontDir)) {
    process.env.PDFKIT_FONT_PATH = fontDir;
  }
}

const UNDERTAKING_BODY = `I, the undersigned applicant, hereby submit this Digital Undertaking for the Viddhakarma Research Fellowship administered by Vd. Gogate Memorial Foundation, Pune.

I confirm that:
1. I have read and agree to abide by the Viddhakarma Research Fellowship Rulebook and all fellowship rules.
2. I certify that all information and documents submitted in my application are true and correct to the best of my knowledge.
3. I agree to utilize fellowship funds strictly for approved research purposes and maintain proper accounts, bills, and utilization records as required.

I understand that any false statement, ethical misconduct, or misuse of funds may lead to rejection, termination of fellowship, or recovery of disbursed amounts.`;

const AUDIT_NOTE =
  "This document was electronically generated and signed through the VGMF Fellowship Portal. The timestamp and IP address above form part of the audit record.";

type GenerateUndertakingPdfParams = {
  applicationId: string;
  applicationNumber: string;
  fullName: string;
  signatureBuffer: Buffer;
  ipAddress: string;
  submittedAt: Date;
};

export async function generateUndertakingPdf(
  params: GenerateUndertakingPdfParams
): Promise<{ pdfBuffer: Buffer; pdfPath: string }> {
  ensurePdfkitFonts();
  const branding = await loadPdfLetterheadBranding();

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    params.applicationId,
    "undertaking"
  );
  await mkdir(uploadDir, { recursive: true });

  const fileName = `undertaking_${params.applicationNumber}_${Date.now()}.pdf`;
  const fullPath = path.join(uploadDir, fileName);
  const documentSubtitle = `${branding.siteName} — Fellowship Declaration`;

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      margin: PDF_PAGE_MARGIN,
      size: "A4",
      bufferPages: true,
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    applyPdfLetterheadLayout(doc);
    doc.y = PDF_CONTENT_TOP;

    doc.fontSize(10).font("Helvetica-Bold").text("Application Number: ", { continued: true });
    doc.font("Helvetica").text(params.applicationNumber);
    doc.font("Helvetica-Bold").text("Applicant Name: ", { continued: true });
    doc.font("Helvetica").text(params.fullName);
    doc.font("Helvetica-Bold").text("Submitted At: ", { continued: true });
    doc.font("Helvetica").text(
      params.submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    );
    doc.font("Helvetica-Bold").text("IP Address: ", { continued: true });
    doc.font("Helvetica").text(params.ipAddress);
    doc.moveDown(1);

    doc.fontSize(10).font("Helvetica").text(UNDERTAKING_BODY, { align: "justify", lineGap: 4 });
    doc.moveDown(1.5);

    doc.font("Helvetica-Bold").text("Digital Signature:");
    doc.moveDown(0.5);
    try {
      const currentY = doc.y;
      doc.image(params.signatureBuffer, doc.x, currentY, { fit: [200, 80] });
      doc.y = currentY + 85;
    } catch {
      doc.font("Helvetica").text("[Signature image attached]");
    }

    stampPdfLetterheadOnAllPages(doc, branding, {
      documentTitle: "DIGITAL UNDERTAKING",
      documentSubtitle,
      auditNote: AUDIT_NOTE,
    });
    doc.end();
  });

  try {
    await writeFile(fullPath, pdfBuffer);
  } catch {
    // Disk write is optional; database copy is the source of truth on Render.
  }

  return {
    pdfBuffer,
    pdfPath: `/uploads/${params.applicationId}/undertaking/${fileName}`,
  };
}
