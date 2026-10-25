import type { Encoder, ExportFormat, ExportPayload } from './types';

export * from './select';
export * from './types';

interface FormatSpec {
  label: string;
  extension: string;
  description: string;
  /** Encoders are code-split so heavy dependencies (jsPDF) only load when that format is used. */
  load: () => Promise<Encoder>;
}

export const EXPORT_FORMATS: Record<ExportFormat, FormatSpec> = {
  csv: {
    label: 'CSV',
    extension: 'csv',
    description: 'Spreadsheet-ready. Opens in Excel, Numbers and Google Sheets.',
    load: () => import('./formats/csv').then((m) => m.encodeCsv),
  },
  json: {
    label: 'JSON',
    extension: 'json',
    description: 'Structured data with filters and summary, for scripts and backups.',
    load: () => import('./formats/json').then((m) => m.encodeJson),
  },
  pdf: {
    label: 'PDF',
    extension: 'pdf',
    description: 'Formatted report with totals and a category breakdown.',
    load: () => import('./formats/pdf').then((m) => m.encodePdf),
  },
};

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

/** Strips characters that are invalid in filenames on common OSes, plus a trailing extension the user may have typed. */
export function sanitizeFilename(name: string, format: ExportFormat): string {
  const ext = new RegExp(`\\.${EXPORT_FORMATS[format].extension}$`, 'i');
  return name.replace(INVALID_FILENAME_CHARS, '').replace(ext, '').trim().replace(/^\.+|\.+$/g, '');
}

export async function buildExport(payload: ExportPayload): Promise<{ blob: Blob; filename: string }> {
  const spec = EXPORT_FORMATS[payload.options.format];
  const encode = await spec.load();
  const blob = await encode(payload);
  return { blob, filename: `${sanitizeFilename(payload.options.filename, payload.options.format)}.${spec.extension}` };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick; some browsers cancel the download if the URL is revoked synchronously.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
