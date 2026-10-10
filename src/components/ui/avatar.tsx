import { initials } from '@/utils/format';
import { cn } from '@/utils/cn';

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string; size?: number; className?: string }) {
  if (src) return <img src={src} alt="" width={size} height={size} className={cn('rounded-full object-cover', className)} />;
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn('grid shrink-0 place-items-center rounded-full bg-brand-600 font-semibold text-white', className)}
    >
      {initials(name)}
    </span>
  );
}
