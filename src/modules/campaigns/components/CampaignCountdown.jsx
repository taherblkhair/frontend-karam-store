import { useEffect, useRef } from 'react';
import { useCountdown } from '@shared/hooks/useCountdown';

const pad = (n) => String(n).padStart(2, '0');

const UNITS = [
  ['days', 'يوم'],
  ['hours', 'ساعة'],
  ['minutes', 'دقيقة'],
  ['seconds', 'ثانية'],
];

/**
 * Countdown to the campaign end date stored in the DB.
 * variant: "bar" (announcement strip) · "hero" (campaign page) · "inline" (product page)
 */
export function CampaignCountdown({ endsAt, serverTime, variant = 'bar', onExpire, className = '' }) {
  const time = useCountdown(endsAt, serverTime);
  const firedRef = useRef(false);

  useEffect(() => {
    if (time.expired && !firedRef.current) {
      firedRef.current = true;
      onExpire?.();
    }
  }, [time.expired, onExpire]);

  const label = `${time.days} يوم ${time.hours} ساعة ${time.minutes} دقيقة ${time.seconds} ثانية`;

  if (variant === 'hero') {
    return (
      <div className={`flex items-stretch gap-2 sm:gap-3 ${className}`} role="timer" aria-label={`ينتهي العرض خلال ${label}`}>
        {UNITS.map(([key, unit]) => (
          <div key={key} className="flex min-w-[3.75rem] sm:min-w-[4.5rem] flex-col items-center rounded-2xl bg-white/95 px-2 py-2 sm:py-3 text-ink-800 shadow-sm dark:bg-gray-900/90 dark:text-white">
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums leading-none">{pad(time[key])}</span>
            <span className="mt-1 text-[11px] sm:text-xs font-medium text-ink-500 dark:text-gray-300">{unit}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <span className={`inline-flex items-baseline gap-1 tabular-nums font-bold ${className}`} role="timer" aria-label={`ينتهي العرض خلال ${label}`}>
      {UNITS.map(([key, unit], i) => (
        <span key={key} className="inline-flex items-baseline gap-0.5">
          {i > 0 ? <span className="opacity-60 px-0.5" aria-hidden>:</span> : null}
          <span>{pad(time[key])}</span>
          <span className="text-[10px] sm:text-xs font-medium opacity-80">{unit}</span>
        </span>
      ))}
    </span>
  );
}
