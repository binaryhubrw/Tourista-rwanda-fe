import { cn } from '@/utils/cn';

/**
 * Simplified payment-provider marks drawn inline (no external assets).
 * They keep each provider's own colours so they're recognisable at a glance.
 */

export function VisaLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 16" className={cn('h-4 w-auto', className)} role="img" aria-label="Visa">
      <text x="24" y="13.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="15" fontWeight="900" fontStyle="italic" fill="#1A1F71" letterSpacing="-0.5">VISA</text>
    </svg>
  );
}

export function MastercardLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 20" className={cn('h-5 w-auto', className)} role="img" aria-label="Mastercard">
      <circle cx="11" cy="10" r="9" fill="#EB001B" />
      <circle cx="21" cy="10" r="9" fill="#F79E1B" />
      <path d="M16 2.5a9 9 0 0 1 0 15 9 9 0 0 1 0-15z" fill="#FF5F00" />
    </svg>
  );
}

/** A bank card with chip, for the "Card" option tile. */
export function CardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={cn('h-8 w-12', className)} aria-hidden>
      <rect x="1" y="1" width="46" height="30" rx="5" fill="#00628B" />
      <rect x="1" y="7" width="46" height="5" fill="#003B53" />
      <rect x="6" y="16" width="8" height="6" rx="1.5" fill="#F5C451" />
      <rect x="6" y="25" width="18" height="2" rx="1" fill="#CCE4EE" />
      <circle cx="35" cy="22" r="4" fill="#EB001B" opacity="0.95" />
      <circle cx="40" cy="22" r="4" fill="#F79E1B" opacity="0.95" />
    </svg>
  );
}

export function MtnLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={cn('h-8 w-12', className)} role="img" aria-label="MTN Mobile Money">
      <rect x="0" y="0" width="48" height="32" rx="6" fill="#FFCB05" />
      <ellipse cx="24" cy="16" rx="19" ry="11" fill="none" stroke="#000" strokeWidth="2.2" />
      <text x="24" y="20.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="12" fontWeight="900" fill="#000">MTN</text>
    </svg>
  );
}

export function AirtelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={cn('h-8 w-12', className)} role="img" aria-label="Airtel Money">
      <rect x="0" y="0" width="48" height="32" rx="6" fill="#E40000" />
      <path d="M14 9.5c3.2-3.6 9.5-3.4 11.4.7 1.3 2.8-.4 5.6-3.4 6.9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <text x="24" y="25" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="10.5" fontWeight="700" fill="#fff">airtel</text>
    </svg>
  );
}
