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
  documentSubtitle?: string,
  options?: { resetCursor?: boolean }
) {
  const pageWidth = doc.page.width;
  const left = PDF_PAGE_MARGIN;
  const right = pageWidth - PDF_PAGE_MARGIN;
  const headerTop = PDF_PAGE_MARGIN;
  const savedY = doc.y;
  const savedX = doc.x;

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
    lineBreak: false,
  });

  doc.fillColor(MUTED).font("Helvetica").fontSize(9);
  doc.text(branding.siteName, textLeft, headerTop + 28, {
    width: right - textLeft,
    lineBreak: false,
  });

  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(11);
  doc.text(documentTitle, textLeft, headerTop + 44, {
    width: right - textLeft,
    lineBreak: false,
  });

  if (documentSubtitle) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(9);
    doc.text(documentSubtitle, textLeft, headerTop + 58, {
      width: right - textLeft,
      lineBreak: false,
    });
  }

  const contact = contactLine(branding);
  if (contact) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(7.5);
    doc.text(contact, left, headerTop + 74, {
      width: right - left,
      align: "right",
      lineBreak: false,
    });
  }

  doc.restore();
  doc.fillColor("#111111");
  doc.x = savedX;
  doc.y = options?.resetCursor === false ? savedY : PDF_CONTENT_TOP;
}

export function drawPdfFooter(
  doc: InstanceType<typeof PDFDocument>,
  branding: PdfLetterheadBranding,
  options?: { auditNote?: string; pageNumber?: number }
) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = PDF_PAGE_MARGIN;
  const right = pageWidth - PDF_PAGE_MARGIN;
  const footerTop = pageHeight - PDF_PAGE_MARGIN - PDF_FOOTER_HEIGHT + 8;
  const savedY = doc.y;
  const savedX = doc.x;
  const pageNumber = options?.pageNumber ?? 1;

  doc.save();
  doc.strokeColor(BRAND_GOLD).lineWidth(0.75);
  doc.moveTo(left, footerTop).lineTo(right, footerTop).stroke();

  doc.fillColor(MUTED).font("Helvetica").fontSize(8);
  doc.text(branding.footerLine, left, footerTop + 8, {
    width: right - left,
    align: "center",
    lineBreak: false,
  });

  const contact = contactLine(branding);
  if (contact) {
    doc.fontSize(7.5).text(contact, left, footerTop + 20, {
      width: right - left,
      align: "center",
      lineBreak: false,
    });
  }

  if (options?.auditNote) {
    doc.fontSize(7).text(options.auditNote, left, footerTop + 32, {
      width: right - left,
      align: "center",
      lineBreak: false,
    });
  }

  doc.fillColor(MUTED).fontSize(7.5);
  doc.text(`Page ${pageNumber}`, left, footerTop + 44, {
    width: right - left,
    align: "right",
    lineBreak: false,
  });

  doc.restore();
  doc.fillColor("#111111");
  doc.x = savedX;
  doc.y = savedY;
}

/** Stamp header/footer on every page after content is written (avoids pageAdded loops). */
export function stampPdfLetterheadOnAllPages(
  doc: InstanceType<typeof PDFDocument>,
  branding: PdfLetterheadBranding,
  options?: {
    documentTitle?: string;
    documentSubtitle?: string;
    auditNote?: string;
  }
) {
  const range = doc.bufferedPageRange();
  const lastPageIndex = range.start + range.count - 1;
  console.log("PDF generated with pages:", range.count);

  const originalTop = doc.page.margins.top;
  const originalBottom = doc.page.margins.bottom;
  doc.page.margins.top = 0;
  doc.page.margins.bottom = 0;

  for (let pageIndex = range.start; pageIndex <= lastPageIndex; pageIndex++) {
    doc.switchToPage(pageIndex);
    if (options?.documentTitle) {
      drawPdfHeader(doc, branding, options.documentTitle, options.documentSubtitle, {
        resetCursor: false,
      });
    }
    drawPdfFooter(doc, branding, {
      auditNote: options?.auditNote,
      pageNumber: pageIndex - range.start + 1,
    });
  }

  doc.page.margins.top = originalTop;
  doc.page.margins.bottom = originalBottom;
  doc.switchToPage(lastPageIndex);
}
