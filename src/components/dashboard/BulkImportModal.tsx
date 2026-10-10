import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileUp, RotateCcw } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { csvTemplate, parseRecords } from '@/utils/csv';
import { downloadFile } from '@/utils/export';
import { cn } from '@/utils/cn';

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  example: string;
  hint?: string;
}

export interface ParsedRow<T> {
  value?: T;
  errors: string[];
}

interface Props<T> {
  open: boolean;
  onClose: () => void;
  /** Plural noun, e.g. "users". */
  entity: string;
  fields: ImportField[];
  /** Validates one record. `all` is every record in the file (for duplicate checks). */
  parse: (record: Record<string, string>, index: number, all: Record<string, string>[]) => ParsedRow<T>;
  /** Short label for a record in the preview, e.g. its name. */
  describe: (record: Record<string, string>) => string;
  onImport: (rows: T[]) => Promise<void>;
}

interface Row<T> { line: number; record: Record<string, string>; parsed: ParsedRow<T> }

/** Upload a CSV/JSON file, preview and validate each row, then create the valid ones in one go. */
export function BulkImportModal<T>({ open, onClose, entity, fields, parse, describe, onImport }: Props<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Row<T>[] | null>(null);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => { setRows(null); setFileName(''); setFileError(''); setOnlyErrors(false); };
  const close = () => { reset(); onClose(); };

  const readFile = async (file?: File) => {
    if (!file) return;
    setFileError('');
    if (!/\.(csv|json|txt)$/i.test(file.name)) return setFileError('Use a .csv or .json file. In Excel, choose File → Save As → CSV.');
    try {
      const records = parseRecords(await file.text(), file.name, fields);
      if (!records.length) return setFileError('No rows found in this file.');
      if (records.length > 1000) return setFileError('Import up to 1,000 rows at a time.');
      setFileName(file.name);
      // Header is line 1 in a CSV, so data starts on line 2.
      setRows(records.map((record, i) => ({ line: i + 2, record, parsed: parse(record, i, records) })));
    } catch (e) {
      setFileError((e as { message?: string }).message ?? 'This file could not be read.');
    }
  };

  const valid = rows?.filter((r) => !r.parsed.errors.length && r.parsed.value !== undefined) ?? [];
  const invalid = rows?.filter((r) => r.parsed.errors.length) ?? [];
  const shown = (onlyErrors ? invalid : rows ?? []).slice(0, 200);
  const previewFields = fields.slice(0, 3);

  const runImport = async () => {
    setImporting(true);
    try {
      await onImport(valid.map((r) => r.parsed.value as T));
      close();
    } catch {
      /* the caller shows the error; keep the preview open so it can be fixed */
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Bulk import ${entity}`}
      size="lg"
      footer={rows ? (
        <>
          <Button variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" aria-hidden />Choose another file</Button>
          <Button onClick={runImport} loading={importing} disabled={!valid.length}>Import {valid.length} {valid.length === 1 ? entity.replace(/s$/, '') : entity}</Button>
        </>
      ) : undefined}
    >
      {!rows ? (
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">Columns in your file</p>
              <Button size="sm" variant="secondary" onClick={() => downloadFile(`${entity}-template.csv`, csvTemplate(fields), 'text/csv;charset=utf-8')}>
                <Download className="h-4 w-4" aria-hidden />Download CSV template
              </Button>
            </div>
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Column</th><th className="px-3 py-2">Example</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((f) => (
                    <tr key={f.key}>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-ink">{f.label}{f.required ? <span className="text-brand-600"> *</span> : <span className="font-normal text-slate-400"> (optional)</span>}{f.hint && <p className="font-normal text-xs text-slate-500">{f.hint}</p>}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{f.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files[0]); }}
            className={cn('flex flex-col items-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors', dragging ? 'border-brand-600 bg-brand-50' : 'border-slate-300')}
          >
            <FileUp className="h-8 w-8 text-brand-600" aria-hidden />
            <p className="mt-2 text-sm text-ink">Drag a CSV or JSON file here, or</p>
            <Button size="sm" className="mt-2" onClick={() => inputRef.current?.click()}>Choose file</Button>
            <input ref={inputRef} type="file" accept=".csv,.json,.txt,text/csv,application/json" className="sr-only" aria-label="Choose a file to import" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
            <p className="mt-2 text-xs text-slate-500">You'll see a preview and any problems before anything is created.</p>
          </div>
          {fileError && <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{fileError}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-ink">{fileName}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />{valid.length} ready</span>
            {invalid.length > 0 && (
              <button onClick={() => setOnlyErrors((v) => !v)} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 hover:underline">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden />{invalid.length} with problems{onlyErrors ? ' · show all' : ' · show only these'}
              </button>
            )}
          </div>
          {invalid.length > 0 && <p className="text-sm text-slate-600">Rows with problems are skipped. Fix them in your file and import it again, or import the {valid.length} ready rows now.</p>}
          <div className="max-h-[45vh] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2">Line</th><th className="px-3 py-2">{previewFields[0]?.label}</th>{previewFields.slice(1).map((f) => <th key={f.key} className="px-3 py-2">{f.label}</th>)}<th className="px-3 py-2">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((r) => (
                  <tr key={r.line} className={r.parsed.errors.length ? 'bg-red-50/40' : ''}>
                    <td className="px-3 py-2 tabular-nums text-slate-500">{r.line}</td>
                    <td className="px-3 py-2 font-semibold text-ink">{describe(r.record) || <span className="text-slate-400">—</span>}</td>
                    {previewFields.slice(1).map((f) => <td key={f.key} className="max-w-[180px] truncate px-3 py-2 text-slate-600">{r.record[f.key] || '—'}</td>)}
                    <td className="px-3 py-2">
                      {r.parsed.errors.length ? (
                        <ul className="space-y-0.5 text-xs text-red-700">{r.parsed.errors.map((e) => <li key={e}>{e}</li>)}</ul>
                      ) : <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Ready</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(onlyErrors ? invalid : rows).length > shown.length && <p className="text-xs text-slate-500">Showing the first {shown.length} rows.</p>}
        </div>
      )}
    </Modal>
  );
}
