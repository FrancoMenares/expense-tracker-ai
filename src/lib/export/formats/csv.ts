import type { Encoder } from '../types';

function escapeCell(value: string): string {
  // Neutralize spreadsheet formula injection, then quote if needed.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const encodeCsv: Encoder = ({ expenses }) => {
  const header = ['Date', 'Category', 'Description', 'Amount'];
  const rows = expenses.map((e) => [e.date, e.category, escapeCell(e.description), e.amount.toFixed(2)]);
  const csv = [header, ...rows].map((row) => row.join(',')).join('\r\n');
  // BOM so Excel opens UTF-8 (emoji, accents) correctly.
  return new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
};
