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



const AUDIT_NOTE =
  "This document was electronically generated and signed through the VGMF Fellowship Portal. The timestamp and IP address above form part of the audit record.";

type GenerateUndertakingPdfParams = {
  applicationId: string;
  applicationNumber: string;
  projectTitle: string;
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
  const documentSubtitle = undefined;

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

    doc.fontSize(9).font("Helvetica-Bold").text("Application Number: ", { continued: true });
    doc.font("Helvetica").text(params.applicationNumber, { continued: true });
    doc.font("Helvetica-Bold").text("   |   Submitted At: ", { continued: true });
    doc.font("Helvetica").text(
      params.submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      { continued: true }
    );
    doc.font("Helvetica-Bold").text("   |   IP: ", { continued: true });
    doc.font("Helvetica").text(params.ipAddress);
    doc.moveDown(2);

    const cleanName = params.fullName.replace(/^(dr\.?|vd\.?)\s+/i, "");
    
    doc.fontSize(11).font("Helvetica").text(`I, Dr. ${cleanName}, hereby declare that:`, { align: "justify", lineGap: 4 });
    doc.moveDown(1);

    doc.text(`1. The research work titled`, { align: "justify", lineGap: 4 });
    doc.font("Helvetica-Bold").text(`"${params.projectTitle}"`);
    doc.font("Helvetica").text(`submitted for the Viddhakarma Research Fellowship – 2026 is my/our original work.`, { align: "justify", lineGap: 4 });
    doc.moveDown(1);

    doc.text(`2. This work has not been submitted, published, accepted, or is under review in any other institution, journal, or fellowship.`, { align: "justify", lineGap: 4 });
    doc.moveDown(1);

    doc.text(`3. The work is free from plagiarism and all references are properly acknowledged.`, { align: "justify", lineGap: 4 });
    doc.moveDown(1);

    doc.text(`4. I/We take full responsibility for the authenticity and accuracy of the submitted work.`, { align: "justify", lineGap: 4 });
    doc.moveDown(1);

    doc.text(`5. In case of any discrepancy found in future, the foundation has full right to cancel the fellowship.`, { align: "justify", lineGap: 4 });
    doc.moveDown(2);

    const dateStr = params.submittedAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
    doc.text(`Date: ${dateStr}`);
    doc.text(`Place: Online Submission`);
    doc.moveDown(1.5);

    doc.text("Signature:");
    doc.moveDown(0.2);
    try {
      const currentY = doc.y;
      doc.image(params.signatureBuffer, doc.x, currentY, { fit: [200, 80] });
      doc.y = currentY + 85;
    } catch {
      doc.font("Helvetica").text("[Signature image attached]");
    }
    
    doc.text(`Name: Dr. ${cleanName}`);

    stampPdfLetterheadOnAllPages(doc, branding, {
      documentTitle: "AFFIDAVIT / DECLARATION",
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
