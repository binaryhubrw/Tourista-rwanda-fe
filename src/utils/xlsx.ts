import { parseRecords } from '@/utils/csv';
import { unzip, zipStore } from '@/utils/zip';

type Field = {
  key: string;
  label: string;
  required?: boolean;
  example: string;
  options?: string[];
  /** When false, the dropdown still appears but typed values are allowed. */
  strict?: boolean;
};

const te = new TextEncoder();
const td = new TextDecoder();
const MAX_DROPDOWN_ROWS = 500;

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function colLetter(i: number) {
  let n = i + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sheetName(label: string, used: Set<string>) {
  const base = label.replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'List';
  let name = base;
  let n = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` ${n++}`;
    name = (base.slice(0, 31 - suffix.length) + suffix).trim();
  }
  used.add(name.toLowerCase());
  return name;
}

function formulaSheet(name: string) {
  return /[^A-Za-z0-9_]/.test(name) ? `'${name.replace(/'/g, "''")}'` : name;
}

function inlineCell(ref: string, value: string, style?: number) {
  const s = style !== undefined ? ` s="${style}"` : '';
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}

function worksheetXml(opts: {
  dimension: string;
  cols: number;
  rows: string;
  freeze?: boolean;
  validations?: string;
}) {
  const views = opts.freeze
    ? `<sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="${opts.dimension}"/>${views}<sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="${opts.cols}" width="24" customWidth="1"/></cols><sheetData>${opts.rows}</sheetData>${opts.validations ?? ''}<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0"/><xf fontId="1" fillId="2" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`;
}

function contentTypes(sheetCount: number) {
  const sheets = Array.from({ length: sheetCount }, (_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
}

function rels(targets: { id: string; type: string; target: string }[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${targets.map((t) => `<Relationship Id="${t.id}" Type="${t.type}" Target="${t.target}"/>`).join('')}</Relationships>`;
}

/** Excel workbook with in-cell dropdowns (hidden list sheets + data validation), matching admin bulk-upload templates. */
export function buildXlsxTemplate(entity: string, fields: Field[]): Blob {
  const dataName = entity.charAt(0).toUpperCase() + entity.slice(1);
  const used = new Set<string>([dataName.toLowerCase(), 'instructions']);
  const lookups = fields
    .filter((f) => f.options?.length)
    .map((f) => ({ field: f, name: sheetName(f.label, used), values: [...new Set(f.options!)] }));

  const lastCol = colLetter(fields.length - 1);
  const headerCells = fields.map((f, i) => inlineCell(`${colLetter(i)}1`, `${f.label}${f.required ? '*' : ''}`, 1)).join('');
  const exampleCells = fields.map((f, i) => inlineCell(`${colLetter(i)}2`, f.example)).join('');
  const validations = lookups.length
    ? `<dataValidations count="${lookups.length}">${lookups.map((l) => {
      const col = colLetter(fields.indexOf(l.field));
      const last = l.values.length + 1;
      const allowBlank = l.field.required ? '' : ' allowBlank="1"';
      const error = l.field.strict === false ? '' : ' showErrorMessage="1" errorTitle="Invalid selection" error="Please select a value from the dropdown list."';
      return `<dataValidation type="list"${allowBlank}${error} sqref="${col}2:${col}${MAX_DROPDOWN_ROWS}"><formula1>${formulaSheet(l.name)}!$A$2:$A$${last}</formula1></dataValidation>`;
    }).join('')}</dataValidations>`
    : '';

  const dataSheet = worksheetXml({
    dimension: `A1:${lastCol}2`,
    cols: fields.length,
    freeze: true,
    rows: `<row r="1" ht="22" customHeight="1">${headerCells}</row><row r="2">${exampleCells}</row>`,
    validations,
  });

  const instructionLines = [
    `${dataName} bulk upload`,
    `1. Start on the ${dataName} tab. Delete the example row before uploading.`,
    '2. Use the dropdown on lookup columns (click the cell, then the arrow).',
    '3. Columns marked with * are required.',
    '4. Re-download this template after new destinations, owners, or other lists change.',
    '5. After you fill it in, upload the .xlsx here. The preview checks values before anything is created.',
  ];
  const instructionRows = instructionLines.map((line, i) => `<row r="${i + 1}">${inlineCell(`A${i + 1}`, line)}</row>`).join('');
  const instructionsSheet = worksheetXml({
    dimension: `A1:A${instructionLines.length}`,
    cols: 1,
    rows: instructionRows,
  });

  const lookupSheets = lookups.map((l) => {
    const rows = [`<row r="1">${inlineCell('A1', 'name', 1)}</row>`,
      ...l.values.map((v, i) => `<row r="${i + 2}">${inlineCell(`A${i + 2}`, v)}</row>`)];
    return worksheetXml({
      dimension: `A1:A${l.values.length + 1}`,
      cols: 1,
      rows: rows.join(''),
    });
  });

  const sheets = [
    { name: dataName, xml: dataSheet, hidden: false },
    { name: 'Instructions', xml: instructionsSheet, hidden: false },
    ...lookups.map((l, i) => ({ name: l.name, xml: lookupSheets[i], hidden: true })),
  ];

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}"${s.hidden ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`;

  const wbRels = rels([
    ...sheets.map((_, i) => ({
      id: `rId${i + 1}`,
      type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet',
      target: `worksheets/sheet${i + 1}.xml`,
    })),
    { id: `rId${sheets.length + 1}`, type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles', target: 'styles.xml' },
  ]);

  const files = [
    { name: '[Content_Types].xml', data: te.encode(contentTypes(sheets.length)) },
    { name: '_rels/.rels', data: te.encode(rels([{ id: 'rId1', type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument', target: 'xl/workbook.xml' }])) },
    { name: 'xl/workbook.xml', data: te.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: te.encode(wbRels) },
    { name: 'xl/styles.xml', data: te.encode(stylesXml()) },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: te.encode(s.xml) })),
  ];

  return new Blob([zipStore(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function parseXlsxRecords(buf: ArrayBuffer, fields: Field[]): Promise<Record<string, string>[]> {
  const files = await unzip(buf);
  const workbook = td.decode(need(files, 'xl/workbook.xml'));
  const relsXml = td.decode(need(files, 'xl/_rels/workbook.xml.rels'));
  const relTarget = (id: string) => {
    const m = relsXml.match(new RegExp(`Id="${id}"[^>]*Target="([^"]+)"`)) ?? relsXml.match(new RegExp(`Target="([^"]+)"[^>]*Id="${id}"`));
    if (!m) throw new Error('This Excel file is missing a worksheet.');
    const t = m[1].replace(/^\//, '');
    return t.startsWith('xl/') ? t : `xl/${t.replace(/^\.\.\//, '')}`;
  };
  const sheetTags = [...workbook.matchAll(/<sheet\b([^>]*)\/>/g)];
  const dataSheet = sheetTags.find((m) => !/\bstate="(?:hidden|veryHidden)"/.test(m[1]) && !/name="Instructions"/i.test(m[1])) ?? sheetTags[0];
  if (!dataSheet) throw new Error('This Excel file has no data sheet.');
  const rid = dataSheet[1].match(/r:id="([^"]+)"/)?.[1];
  if (!rid) throw new Error('This Excel file has no data sheet.');
  const sheetXml = td.decode(need(files, relTarget(rid).replace(/\\/g, '/')));
  const shared = parseSharedStrings(files.get('xl/sharedStrings.xml'));
  const grid = parseSheetGrid(sheetXml, shared);
  if (grid.length < 2) throw new Error('The file needs a header row and at least one data row.');
  const [header, ...body] = grid;
  const csv = [header, ...body].map((r) => r.map(csvEscape).join(',')).join('\r\n');
  return parseRecords(csv, 'import.csv', fields);
}

function need(files: Map<string, Uint8Array>, name: string) {
  const key = [...files.keys()].find((k) => k.replace(/\\/g, '/') === name);
  if (!key) throw new Error('This Excel file could not be read.');
  return files.get(key)!;
}

function parseSharedStrings(buf?: Uint8Array) {
  if (!buf) return [] as string[];
  const xmlText = td.decode(buf);
  return [...xmlText.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) =>
    [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodeXml(t[1])).join(''));
}

function parseSheetGrid(sheetXml: string, shared: string[]) {
  const rows = new Map<number, Map<number, string>>();
  let maxCol = 0;
  let maxRow = 0;
  for (const cell of sheetXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const ref = cell[1].match(/\br="([A-Z]+)(\d+)"/i);
    if (!ref) continue;
    const col = colIndex(ref[1]);
    const row = Number(ref[2]);
    const type = cell[1].match(/\bt="([^"]+)"/)?.[1];
    let value = '';
    if (type === 'inlineStr') value = [...cell[2].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodeXml(t[1])).join('');
    else {
      const v = cell[2].match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
      value = type === 's' ? (shared[Number(v)] ?? '') : decodeXml(v);
    }
    if (!rows.has(row)) rows.set(row, new Map());
    rows.get(row)!.set(col, value);
    maxCol = Math.max(maxCol, col);
    maxRow = Math.max(maxRow, row);
  }
  const grid: string[][] = [];
  for (let r = 1; r <= maxRow; r++) {
    const map = rows.get(r);
    const line = Array.from({ length: maxCol + 1 }, (_, c) => map?.get(c) ?? '');
    if (line.some((v) => v.trim() !== '')) grid.push(line);
  }
  return grid;
}

function colIndex(letters: string) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function decodeXml(s: string) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function csvEscape(v: string) {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
