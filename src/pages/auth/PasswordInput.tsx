import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui';

export function PasswordInput({ label, error, ...rest }: ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input label={label} error={error} type={show ? 'text' : 'password'} required className="pr-11" {...rest} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1.5 top-[1.9rem] grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink" aria-label={show ? `Hide ${label?.toString().toLowerCase()}` : `Show ${label?.toString().toLowerCase()}`}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
