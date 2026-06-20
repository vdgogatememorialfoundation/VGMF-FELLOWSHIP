import type PDFDocument from "pdfkit";
import { getSiteSettings } from "./cms";
import { getSiteAsset } from "./site-assets";
import {
  ORGANIZATION_FOOTER,
  ORGANIZATION_NAME,
  SITE_NAME,
} from "./constants";

export type PdfLetterheadBranding = {
  organizationName: string;
  siteName: string;
  footerLine: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  logoBuffer: Buffer | null;
  logoMimeType: string | null;
};

export const PDF_PAGE_MARGIN = 50;
export const PDF_HEADER_HEIGHT = 92;
export const PDF_FOOTER_HEIGHT = 58;
export const PDF_CONTENT_TOP = PDF_PAGE_MARGIN + PDF_HEADER_HEIGHT;
export const PDF_CONTENT_BOTTOM = PDF_PAGE_MARGIN + PDF_FOOTER_HEIGHT;

const BRAND_GREEN = "#1b6b52";
const BRAND_GOLD = "#c9a227";
const MUTED = "#5f7a70";

export async function loadPdfLetterheadBranding(): Promise<PdfLetterheadBranding> {
  const [settings, logo] = await Promise.all([
    getSiteSettings(),
    getSiteAsset("logo"),
  ]);

  const logoMimeType = logo?.mimeType || null;
  const logoBuffer =
    logo && logoMimeType && !logoMimeType.includes("svg") ? logo.data : null;

  return {
    organizationName: settings.headerOrgName?.trim() || ORGANIZATION_NAME,
    siteName: settings.siteName?.trim() || SITE_NAME,
    footerLine: settings.footerDeveloperCredit?.trim() || ORGANIZATION_FOOTER,
    contactEmail: settings.contactEmail?.trim() || null,
    contactPhone: settings.contactPhone?.trim() || null,
    contactAddress: settings.contactAddress?.trim() || null,
    logoBuffer,
    logoMimeType,
  };
}

function contactLine(branding: PdfLetterheadBranding): string {
  return [branding.contactEmail, branding.contactPhone, branding.contactAddress]
    .filter(Boolean)
    .join("  ·  ");
}

export function applyPdfLetterheadLayout(doc: InstanceType<typeof PDFDocument>) {
  doc.page.margins.top = PDF_CONTENT_TOP;
  doc.page.margins.bottom = PDF_CONTENT_BOTTOM;
}

export function drawPdfHeader(
  doc: InstanceType<typeof PDFDocument>,
  branding: PdfLetterheadBranding,
  documentTitle: string,
  documentSubtitle?: string
) {
  const pageWidth = doc.page.width;
  const left = PDF_PAGE_MARGIN;
  const right = pageWidth - PDF_PAGE_MARGIN;
  const headerTop = PDF_PAGE_MARGIN;

  doc.save();
  doc.rect(left, headerTop, right - left, 3).fill(BRAND_GREEN);
  doc.rect(left, headerTop + 3, right - left, 1).fill(BRAND_GOLD);

  let textLeft = left;
  if (branding.logoBuffer) {
    try {
      doc.image(branding.logoBuffer, left, headerTop + 10, { fit: [52, 52] });
      textLeft = left + 60;
    } catch {
      // Ignore unsupported logo formats.
    }
  }

  doc.fillColor(BRAND_GREEN).font("Helvetica-Bold").fontSize(13);
  doc.text(branding.organizationName, textLeft, headerTop + 12, {
    width: right - textLeft,
  });

  doc.fillColor(MUTED).font("Helvetica").fontSize(9);
  doc.text(branding.siteName, textLeft, headerTop + 28, {
    width: right - textLeft,
  });

  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(11);
  doc.text(documentTitle, textLeft, headerTop + 44, { width: right - textLeft });

  if (documentSubtitle) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(9);
    doc.text(documentSubtitle, textLeft, headerTop + 58, { width: right - textLeft });
  }

  const contact = contactLine(branding);
  if (contact) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(7.5);
    doc.text(contact, left, headerTop + 74, {
      width: right - left,
      align: "right",
    });
  }

  doc.restore();
  doc.fillColor("#111111");
  doc.y = PDF_CONTENT_TOP;
}

export function drawPdfFooter(
  doc: InstanceType<typeof PDFDocument>,
  branding: PdfLetterheadBranding,
  options?: { auditNote?: string }
) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = PDF_PAGE_MARGIN;
  const right = pageWidth - PDF_PAGE_MARGIN;
  const footerTop = pageHeight - PDF_PAGE_MARGIN - PDF_FOOTER_HEIGHT + 8;

  doc.save();
  doc.strokeColor(BRAND_GOLD).lineWidth(0.75);
  doc.moveTo(left, footerTop).lineTo(right, footerTop).stroke();

  doc.fillColor(MUTED).font("Helvetica").fontSize(8);
  doc.text(branding.footerLine, left, footerTop + 8, {
    width: right - left,
    align: "center",
  });

  const contact = contactLine(branding);
  if (contact) {
    doc.fontSize(7.5).text(contact, left, footerTop + 20, {
      width: right - left,
      align: "center",
    });
  }

  if (options?.auditNote) {
    doc.fontSize(7).text(options.auditNote, left, footerTop + 32, {
      width: right - left,
      align: "center",
    });
  }

  doc.fillColor(MUTED).fontSize(7.5);
  doc.text(`Page ${doc.bufferedPageRange().start}`, left, footerTop + 44, {
    width: right - left,
    align: "right",
  });

  doc.restore();
  doc.fillColor("#111111");
}

export function registerPdfLetterhead(
  doc: InstanceType<typeof PDFDocument>,
  branding: PdfLetterheadBranding,
  options?: {
    documentTitle?: string;
    documentSubtitle?: string;
    auditNote?: string;
  }
) {
  doc.on("pageAdded", () => {
    applyPdfLetterheadLayout(doc);
    if (options?.documentTitle) {
      drawPdfHeader(doc, branding, options.documentTitle, options.documentSubtitle);
    }
    drawPdfFooter(doc, branding, { auditNote: options?.auditNote });
  });
}
