import { useId, useRef, useState } from 'react';
import { ImagePlus, Star, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { imageFileToDataUrl } from '@/utils/image';
import { cn } from '@/utils/cn';
import { LoadingMark } from './Loading';

interface Props {
  /** Photo sources; the first one is the cover. */
  value: string[];
  onChange: (photos: string[]) => void;
  max?: number;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

/** Drag-and-drop photo uploader with previews, cover selection and reordering. */
export function ImageUpload({ value, onChange, max = 6, label = 'Photos', hint, error, required }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(0);
  const [fileError, setFileError] = useState('');
  const room = max - value.length;

  const addFiles = async (files: FileList | File[]) => {
    setFileError('');
    const list = [...files].slice(0, room);
    if (files.length > room) setFileError(`You can add up to ${max} photos. ${files.length - room} not added.`);
    if (!list.length) return;
    setProcessing(list.length);
    const added: string[] = [];
    for (const f of list) {
      try {
        added.push(await imageFileToDataUrl(f));
      } catch (e) {
        setFileError((e as { message: string }).message);
      }
      setProcessing((n) => n - 1);
    }
    onChange([...value, ...added]);
  };

  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-ink" id={`${id}-label`}>
        {label} {required && <span className="text-brand-600" aria-hidden>*</span>}
        <span className="ml-2 font-normal text-slate-500">{value.length}/{max}</span>
      </p>

      {room > 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          className={cn('flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors', dragging ? 'border-brand-600 bg-brand-50' : error ? 'border-red-300' : 'border-slate-300 hover:border-brand-400')}
        >
          {processing > 0 ? <LoadingMark size="md" /> : <ImagePlus className="h-7 w-7 text-brand-600" aria-hidden />}
          <p className="mt-2 text-sm text-ink">
            {processing > 0 ? `Processing ${processing} photo${processing > 1 ? 's' : ''}…` : <>Drag photos here or <button type="button" onClick={() => inputRef.current?.click()} className="font-semibold text-brand-600 underline-offset-2 hover:underline">browse files</button></>}
          </p>
          <p className="text-xs text-slate-500">JPG, PNG or WebP, up to 15 MB each. The first photo is the cover.</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            aria-labelledby={`${id}-label`}
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
          />
        </div>
      )}

      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((src, i) => (
            <li key={`${i}-${src.slice(-16)}`} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img src={src} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
              {i === 0 && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white"><Star className="h-3 w-3" aria-hidden />Cover</span>}
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-ink shadow hover:text-red-600" aria-label={`Remove photo ${i + 1}`}>
                <X className="h-4 w-4" />
              </button>
              <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1">
                <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-ink shadow disabled:opacity-0" aria-label={`Move photo ${i + 1} earlier`}><ChevronLeft className="h-4 w-4" /></button>
                {i !== 0 && <button type="button" onClick={() => move(i, 0)} className="rounded-full bg-white/95 px-2 text-[11px] font-semibold text-brand-600 shadow">Make cover</button>}
                <button type="button" disabled={i === value.length - 1} onClick={() => move(i, i + 1)} className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-ink shadow disabled:opacity-0" aria-label={`Move photo ${i + 1} later`}><ChevronRight className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(error || fileError) ? <p className="text-sm text-red-600">{error || fileError}</p> : hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}
