import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { CATEGORIES } from '../../types';
import { formatCurrency, formatDate } from '../../format';
import type { Encoder } from '../types';

type RGB = [number, number, number];

const INDIGO: RGB = [79, 70, 229];
const SLATE_900: RGB = [15, 23, 42];
const SLATE_500: RGB = [100, 116, 139];
const SLATE_200: RGB = [226, 232, 240];
const SLATE_50: RGB = [248, 250, 252];
const MARGIN = 48;

/** The built-in PDF fonts only cover Latin-1; drop anything else (e.g. emoji) rather than render garbage. */
function pdfText(value: string): string {
  return value.normalize('NFC').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').replace(/\s+/g, ' ').trim();
}

function describePeriod(startDate: string, endDate: string): string {
  if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  if (startDate) return `From ${formatDate(startDate)}`;
  if (endDate) return `Through ${formatDate(endDate)}`;
  return 'All time';
}

export const encodePdf: Encoder = ({ expenses, summary, options, generatedAt }) => {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title block
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...SLATE_900);
  doc.text('Expense Report', MARGIN, MARGIN + 12);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...SLATE_500);
  const categories =
    options.categories.length === CATEGORIES.length ? 'All categories' : options.categories.join(', ');
  const generated = generatedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  doc.text(`Period: ${describePeriod(options.startDate, options.endDate)}`, MARGIN, MARGIN + 30);
  doc.text(`Categories: ${categories}`, MARGIN, MARGIN + 42, { maxWidth: pageWidth - MARGIN * 2 });
  doc.text(`Generated ${generated}`, pageWidth - MARGIN, MARGIN + 12, { align: 'right' });

  // Headline figures
  const statsY = MARGIN + 66;
  const stats: [string, string][] = [
    ['Records', String(summary.count)],
    ['Total spent', formatCurrency(summary.total)],
    ['Average', formatCurrency(summary.count ? summary.total / summary.count : 0)],
  ];
  const boxWidth = (pageWidth - MARGIN * 2 - 16) / stats.length;
  stats.forEach(([label, value], i) => {
    const x = MARGIN + i * (boxWidth + 8);
    doc.setFillColor(...SLATE_50).setDrawColor(...SLATE_200).roundedRect(x, statsY, boxWidth, 48, 6, 6, 'FD');
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...SLATE_500).text(label.toUpperCase(), x + 12, statsY + 18);
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...SLATE_900).text(value, x + 12, statsY + 37);
  });

  const tableStyles = {
    theme: 'grid' as const,
    margin: { left: MARGIN, right: MARGIN, bottom: MARGIN + 12 },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, lineColor: SLATE_200, lineWidth: 0.5, textColor: SLATE_900 },
    headStyles: { fillColor: INDIGO, textColor: [255, 255, 255] as RGB, fontStyle: 'bold' as const },
    footStyles: { fillColor: SLATE_50, textColor: SLATE_900, fontStyle: 'bold' as const },
    alternateRowStyles: { fillColor: SLATE_50 },
  };

  // Category breakdown
  autoTable(doc, {
    ...tableStyles,
    startY: statsY + 72,
    head: [['Category', 'Records', 'Amount', 'Share']],
    body: summary.byCategory.map((c) => [
      c.category,
      String(c.count),
      formatCurrency(c.amount),
      `${summary.total > 0 ? ((c.amount / summary.total) * 100).toFixed(1) : '0.0'}%`,
    ]),
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    tableWidth: (pageWidth - MARGIN * 2) * 0.6,
  });

  // Line items
  const afterBreakdown = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...SLATE_900).text('Transactions', MARGIN, afterBreakdown + 28);
  autoTable(doc, {
    ...tableStyles,
    startY: afterBreakdown + 38,
    head: [['Date', 'Category', 'Amount', 'Description']],
    body: expenses.map((e) => [formatDate(e.date), e.category, formatCurrency(e.amount), pdfText(e.description)]),
    foot: [['Total', '', formatCurrency(summary.total), `${summary.count} records`]],
    showFoot: 'lastPage',
    columnStyles: {
      0: { cellWidth: 82 },
      1: { cellWidth: 92 },
      2: { cellWidth: 78, halign: 'right' },
    },
  });

  // Page footer on every page
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...SLATE_500);
    doc.text('Expense Tracker', MARGIN, pageHeight - MARGIN / 2);
    doc.text(`Page ${page} of ${pages}`, pageWidth - MARGIN, pageHeight - MARGIN / 2, { align: 'right' });
  }

  return doc.output('blob');
};
