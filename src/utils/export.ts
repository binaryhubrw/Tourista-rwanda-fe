export type ExportCell = string | number | boolean | null | undefined;

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => ExportCell;
}

const escapeCsv = (v: ExportCell) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]) {
  const head = columns.map((c) => escapeCsv(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => escapeCsv(c.value(r))).join(','));
  return [head, ...body].join('\r\n');
}

export function toJson<T>(rows: T[], columns: ExportColumn<T>[]) {
  return JSON.stringify(rows.map((r) => Object.fromEntries(columns.map((c) => [c.header, c.value(r) ?? null]))), null, 2);
}

export function downloadFile(filename: string, content: string, mime: string) {
  // BOM so Excel opens UTF-8 CSVs (names like "Inès") correctly.
  const blob = new Blob([mime.startsWith('text/csv') ? '﻿' : '', content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportRows<T>(format: 'csv' | 'json', baseName: string, rows: T[], columns: ExportColumn<T>[]) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'csv') downloadFile(`${baseName}-${stamp}.csv`, toCsv(rows, columns), 'text/csv;charset=utf-8');
  else downloadFile(`${baseName}-${stamp}.json`, toJson(rows, columns), 'application/json');
}
