import PDFDocument from "pdfkit";
import { existsSync } from "fs";
import path from "path";

function ensurePdfkitFonts() {
  const fontDir = path.join(process.cwd(), "node_modules", "pdfkit", "js", "data");
  if (existsSync(fontDir)) {
    process.env.PDFKIT_FONT_PATH = fontDir;
  }
}

const AGREEMENT_BODY = `This Fellowship Agreement is entered into between Vd. Gogate Memorial Foundation, Pune ("Foundation") and the Fellow named below, for the Viddhakarma Research Fellowship programme.

The Fellow agrees to:
1. Conduct the approved research ethically and in accordance with the Fellowship Rulebook.
2. Utilize fellowship funds solely for approved research purposes and maintain proper accounts.
3. Submit quarterly progress reports, mid-term review materials, and final deliverables as required.
4. Acknowledge the Foundation in all publications arising from this fellowship.
5. Comply with all decisions of the Review Committee and Board of Trustees.

The Foundation agrees to sanction the fellowship amount in three installments (40% / 40% / 20%) subject to satisfactory progress, document verification, and trustee approval.`;

export type GenerateAgreementPdfParams = {
  fellowshipId: string;
  applicationNumber: string;
  fellowName: string;
  projectTitle: string;
  institution: string;
  sanctionedAmount: number;
  duration: string;
  startDate: Date;
  endDate: Date;
};

export async function generateFellowshipAgreementPdf(
  params: GenerateAgreementPdfParams
): Promise<Buffer> {
  ensurePdfkitFonts();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).font("Helvetica-Bold").text("FELLOWSHIP AGREEMENT", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(11)
      .font("Helvetica")
      .text("Viddhakarma Research Fellowship — Vd. Gogate Memorial Foundation, Pune", {
        align: "center",
      });
    doc.moveDown(1.5);

    doc.fontSize(10).font("Helvetica-Bold").text("Fellowship ID: ", { continued: true });
    doc.font("Helvetica").text(params.fellowshipId);
    doc.font("Helvetica-Bold").text("Application Number: ", { continued: true });
    doc.font("Helvetica").text(params.applicationNumber);
    doc.font("Helvetica-Bold").text("Fellow Name: ", { continued: true });
    doc.font("Helvetica").text(params.fellowName);
    doc.font("Helvetica-Bold").text("Institution: ", { continued: true });
    doc.font("Helvetica").text(params.institution || "—");
    doc.font("Helvetica-Bold").text("Project Title: ", { continued: true });
    doc.font("Helvetica").text(params.projectTitle);
    doc.font("Helvetica-Bold").text("Sanctioned Amount: ", { continued: true });
    doc.font("Helvetica").text(`₹${params.sanctionedAmount.toLocaleString("en-IN")}`);
    doc.font("Helvetica-Bold").text("Duration: ", { continued: true });
    doc.font("Helvetica").text(params.duration);
    doc.font("Helvetica-Bold").text("Period: ", { continued: true });
    doc
      .font("Helvetica")
      .text(
        `${params.startDate.toLocaleDateString("en-IN")} to ${params.endDate.toLocaleDateString("en-IN")}`
      );
    doc.font("Helvetica-Bold").text("Generated: ", { continued: true });
    doc.font("Helvetica").text(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
    doc.moveDown(1);

    doc.fontSize(10).font("Helvetica").text(AGREEMENT_BODY, { align: "justify", lineGap: 4 });
    doc.moveDown(2);

    doc.font("Helvetica-Bold").text("For Vd. Gogate Memorial Foundation");
    doc.moveDown(2);
    doc.font("Helvetica-Bold").text("Fellow Acceptance:");
    doc.moveDown(2);
    doc.font("Helvetica").text("Signature: ___________________________    Date: _______________");
    doc.moveDown(1);
    doc
      .fontSize(9)
      .fillColor("#444444")
      .text(
        "This agreement was auto-generated upon fellowship selection. Signed acceptance may be submitted digitally through the Fellowship Portal.",
        { align: "justify" }
      );

    doc.end();
  });
}

export function getFellowshipAgreementUrl(fellowshipId: string): string {
  return `/api/fellowship/${fellowshipId}/agreement`;
}
