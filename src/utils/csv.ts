/** Parses CSV text (RFC 4180 quoting, CRLF/LF, BOM, comma or semicolon delimiter) into rows of cells. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

const normalize = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Turns a CSV or JSON file's text into records keyed by field key. Headers are
 * matched loosely ("Full name", "full_name" and "fullname" all match `fullName`).
 */
export function parseRecords(text: string, fileName: string, fields: { key: string; label: string }[]): Record<string, string>[] {
  const lookup = new Map<string, string>();
  fields.forEach((f) => { lookup.set(normalize(f.key), f.key); lookup.set(normalize(f.label), f.key); });

  const toRecord = (entries: [string, unknown][]) => {
    const rec: Record<string, string> = {};
    entries.forEach(([h, v]) => {
      if (normalize(h).endsWith('selectfrom')) return;
      const key = lookup.get(normalize(h));
      if (key) rec[key] = Array.isArray(v) ? v.join('; ') : v === null || v === undefined ? '' : String(v).trim();
    });
    return rec;
  };

  if (/\.json$/i.test(fileName) || /^\s*[[{]/.test(text)) {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw { message: 'This JSON file could not be read. Check that it is valid JSON.' };
    }
    const list = Array.isArray(data) ? data : [data];
    return list
      .filter((x) => x && typeof x === 'object')
      .map((x) => toRecord(Object.entries(x as object)))
      .filter((rec) => fields.some((f) => (rec[f.key] ?? '').trim() !== ''));
  }

  const rows = parseCsv(text);
  if (rows.length < 2) throw { message: 'The file needs a header row and at least one data row.' };
  const [header, ...body] = rows;
  const known = header.filter((h) => lookup.has(normalize(h)));
  if (!known.length) throw { message: `None of the column headers match. Expected columns like: ${fields.slice(0, 4).map((f) => f.label).join(', ')}.` };
  return body
    .map((r) => toRecord(header.map((h, i) => [h, r[i] ?? ''])))
    .filter((rec) => fields.some((f) => (rec[f.key] ?? '').trim() !== ''));
}

/** Header + sample row (CSV cannot host Excel-style dropdowns). */
export function csvTemplate(fields: { label: string; example: string }[]) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [fields.map((f) => esc(f.label)).join(','), fields.map((f) => esc(f.example)).join(',')].join('\r\n');
}
