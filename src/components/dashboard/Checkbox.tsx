import { useEffect, useRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { indeterminate?: boolean };

/** Native checkbox (keyboard + screen-reader friendly) with brand styling and tri-state support. */
export function Checkbox({ indeterminate = false, className, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn('h-[18px] w-[18px] cursor-pointer rounded border-slate-300 align-middle accent-brand-600 disabled:cursor-not-allowed disabled:opacity-40', className)}
      {...rest}
    />
  );
}
