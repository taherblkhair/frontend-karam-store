import { useEffect, useMemo, useState } from 'react';
import { mediaVariantUrl, resolveMediaUrl } from '@core/api/config.js';

const initialOf = (brand) =>
  String(brand?.name_en || brand?.name_ar || '؟').trim().charAt(0).toUpperCase();

/**
 * Brand image with graceful fallback: 400w variant → original upload → monogram.
 * A missing or broken image never leaves an empty box.
 */
export function BrandLogo({ brand, className = 'h-12 w-12', rounded = 'rounded-xl' }) {
  const sources = useMemo(() => {
    const full = resolveMediaUrl(brand?.logo);
    const small = mediaVariantUrl(brand?.logo, 400);
    return [...new Set([small, full].filter(Boolean))];
  }, [brand?.logo]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setAttempt(0), [sources]);

  const src = sources[attempt];
  const label = brand?.name_en || brand?.name_ar || '';

  if (!src) {
    return (
      <div
        role="img"
        aria-label={label}
        className={`flex shrink-0 items-center justify-center border border-secondary-400/40 bg-gradient-to-br from-primary-50 to-tertiary-100 font-display font-bold text-primary-600 dark:from-primary-900/40 dark:to-gray-800 dark:text-primary-200 ${rounded} ${className}`}
      >
        <span className="text-[1.35em] leading-none">{initialOf(brand)}</span>
      </div>
    );
  }

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden bg-white dark:bg-gray-100 ${rounded} ${className}`}>
      <img
        src={src}
        alt={label}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setAttempt((n) => n + 1)}
        className="h-full w-full object-contain p-1"
      />
    </div>
  );
}
