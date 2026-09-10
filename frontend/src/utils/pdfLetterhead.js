import autoTable from 'jspdf-autotable';
import wallnutLogo from '../assets/logo.png';

/**
 * utils/pdfLetterhead.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared branded PDF header/footer/section helpers — real Wallnut logo, real
 * registered company name — used by every "Download PDF" button across the
 * app (e-Way Bills register/single-bill PDFs, Financials exports, etc.) so
 * every generated document looks consistent, rather than each page
 * reinventing its own layout.
 */

// Real dimensions of assets/logo.png (260x92) — used to size it in the PDF
// without distorting the aspect ratio.
const LOGO_ASPECT_RATIO = 260 / 92;

/** Loads assets/logo.png into a PNG data URL jsPDF's addImage() can embed. */
export function loadLogoAsDataUrl() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = wallnutLogo;
  });
}

/**
 * Draws the shared letterhead — logo, real registered company name, a
 * document-specific title/meta line on the right, and a rule underneath.
 * Returns the layout constants callers need (margin, page width, and the Y
 * just below the rule) to lay out content.
 */
export function drawLetterhead(doc, logoDataUrl, title, meta) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const logoWidth = 30;
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
  const textX = marginX + (logoDataUrl ? logoWidth + 6 : 0);

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', marginX, 10, logoWidth, logoHeight);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text('Wallnut Building Solutions India Pvt Ltd', textX, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('create bonds, forever', textX, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text(title, pageWidth - marginX, 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(meta, pageWidth - marginX, 22, { align: 'right' });

  doc.setDrawColor(61, 168, 85);
  doc.setLineWidth(0.6);
  doc.line(marginX, 27, pageWidth - marginX, 27);

  return { marginX, pageWidth, contentStartY: 34 };
}

/** Page-numbered footer, stamped on every page once the document is complete. */
export function stampFooter(doc, marginX, pageWidth) {
  const totalPages = doc.internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text('Wallnut Building Solutions India Pvt Ltd — Confidential', marginX, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
  }
}

/** A titled key-value section (e.g. "Invoice Details", "Summary") — a small boxed header + a plain two-column table. */
export function drawSection(doc, marginX, pageWidth, startY, title, rows) {
  doc.setFillColor(61, 168, 85);
  doc.rect(marginX, startY, pageWidth - marginX * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255);
  doc.text(title, marginX + 3, startY + 5);

  autoTable(doc, {
    startY: startY + 7,
    margin: { left: marginX, right: marginX },
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [90, 90, 90], cellWidth: 45 },
      1: { textColor: [20, 20, 20] },
    },
    body: rows,
  });

  return doc.lastAutoTable.finalY + 6;
}
