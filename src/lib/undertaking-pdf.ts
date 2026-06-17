import PDFDocument from "pdfkit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { readFile } from "fs/promises";

const UNDERTAKING_BODY = `I, the undersigned applicant, hereby submit this Digital Undertaking for the Viddhakarma Research Fellowship administered by Vd. Gogate Memorial Foundation, Pune.

I confirm that:
1. I have read and agree to abide by the Viddhakarma Research Fellowship Rulebook and all fellowship rules.
2. I certify that all information and documents submitted in my application are true and correct to the best of my knowledge.
3. I agree to utilize fellowship funds strictly for approved research purposes and maintain proper accounts, bills, and utilization records as required.

I understand that any false statement, ethical misconduct, or misuse of funds may lead to rejection, termination of fellowship, or recovery of disbursed amounts.`;

type GenerateUndertakingPdfParams = {
  applicationId: string;
  applicationNumber: string;
  fullName: string;
  signatureImagePath: string;
  ipAddress: string;
  submittedAt: Date;
};

export async function generateUndertakingPdf(
  params: GenerateUndertakingPdfParams
): Promise<string> {
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

  const signatureBuffer = await readFile(
    path.join(process.cwd(), "public", params.signatureImagePath.replace(/^\//, ""))
  );

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", async () => {
      try {
        await writeFile(fullPath, Buffer.concat(chunks));
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    doc.on("error", reject);

    doc.fontSize(16).font("Helvetica-Bold").text("DIGITAL UNDERTAKING", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(11)
      .font("Helvetica")
      .text("Viddhakarma Research Fellowship — Vd. Gogate Memorial Foundation, Pune", {
        align: "center",
      });
    doc.moveDown(1.5);

    doc.fontSize(10).font("Helvetica-Bold").text("Application Number: ", { continued: true });
    doc.font("Helvetica").text(params.applicationNumber);
    doc.font("Helvetica-Bold").text("Applicant Name: ", { continued: true });
    doc.font("Helvetica").text(params.fullName);
    doc.font("Helvetica-Bold").text("Submitted At: ", { continued: true });
    doc.font("Helvetica").text(params.submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
    doc.font("Helvetica-Bold").text("IP Address: ", { continued: true });
    doc.font("Helvetica").text(params.ipAddress);
    doc.moveDown(1);

    doc.fontSize(10).font("Helvetica").text(UNDERTAKING_BODY, { align: "justify", lineGap: 4 });
    doc.moveDown(1.5);

    doc.font("Helvetica-Bold").text("Digital Signature:");
    doc.moveDown(0.5);
    try {
      doc.image(signatureBuffer, { fit: [200, 80] });
    } catch {
      doc.font("Helvetica").text("[Signature image attached]");
    }
    doc.moveDown(1);

    doc
      .fontSize(9)
      .fillColor("#444444")
      .text(
        "This document was electronically generated and signed through the VGMF Fellowship Portal. The timestamp and IP address above form part of the audit record.",
        { align: "justify" }
      );

    doc.end();
  });

  return `/uploads/${params.applicationId}/undertaking/${fileName}`;
}
