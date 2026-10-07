import { forwardRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@modules/store/api/store.api';
import { BrandLogo } from '@shared/components/BrandLogo';
import { normalizeArabic } from '@modules/store/components/SearchableSelect';
import { buildResponsiveMedia, resolveMediaUrl } from '@core/api/config.js';

/** Arabic counting: 1 منتج واحد · 2 منتجان · 3–10 منتجات · 11+ منتج */
export function productsCountLabel(count) {
  const n = Number(count) || 0;
  if (n === 1) return 'منتج واحد';
  if (n === 2) return 'منتجان';
  if (n >= 3 && n <= 10) return `${n} منتجات`;
  return `${n} منتج`;
}

export function useStoreBrands() {
  return useQuery({
    queryKey: ['store-brands'],
    queryFn: () => storeApi.brands(),
    staleTime: 5 * 60_000,
    select: (res) => res?.data || [],
  });
}

export const brandPath = (brand) => `/brand/${encodeURIComponent(brand.slug || brand.id)}`;

/** Latin name reads best for fashion brands; Arabic stays as the secondary line. */
export function brandNames(brand) {
  const en = String(brand?.name_en || '').trim();
  const ar = String(brand?.name_ar || '').trim();
  return en ? { primary: en, secondary: ar && ar !== en ? ar : '' } : { primary: ar, secondary: '' };
}

export function filterBrands(brands, query) {
  const q = normalizeArabic(query);
  if (!q) return brands;
  return brands.filter((b) =>
    [b.name_ar, b.name_en, b.slug].some((v) => normalizeArabic(v).includes(q))
  );
}

export const StoreSearchField = forwardRef(function StoreSearchField(
  { value, onChange, placeholder, label, className = '' },
  ref
) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={18}
        className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-400"
        aria-hidden
      />
      <input
        ref={ref}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        className="input min-h-12 ps-10 pe-11"
        placeholder={placeholder}
        aria-label={label || placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute end-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 hover:bg-tertiary-200 hover:text-ink-700 dark:hover:bg-gray-700"
          aria-label="مسح البحث"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
});

/** Typeset brand name used when no image was uploaded (or it failed to load). */
function BrandWordmark({ name }) {
  const long = name.length > 11;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 bg-gradient-to-br from-tertiary-50 via-white to-primary-50/60 px-3 dark:from-gray-100 dark:via-white dark:to-primary-50">
      <span
        className={`line-clamp-2 text-center font-display font-bold uppercase leading-snug text-primary-700 [overflow-wrap:anywhere] ${
          long ? 'text-sm sm:text-base tracking-[0.06em]' : 'text-base sm:text-lg tracking-[0.18em]'
        }`}
      >
        {name}
      </span>
      <span className="h-px w-8 bg-secondary-400" aria-hidden />
    </div>
  );
}

/**
 * Home-page brand card: the logo fills most of the card, name and count sit below.
 * Logos of any aspect ratio stay whole (object-contain on a white stage).
 */
export function BrandShowcaseCard({ brand, className = '' }) {
  const { primary } = brandNames(brand);
  // 0 = responsive WebP variants, 1 = original upload, 2 = wordmark
  const [stage, setStage] = useState(0);
  useEffect(() => setStage(0), [brand.logo]);

  const media = buildResponsiveMedia(brand.logo, { widths: [400, 800], preferSrcWidth: 400 });
  const original = resolveMediaUrl(brand.logo);
  const showImage = Boolean(brand.logo) && stage < 2;

  return (
    <Link
      to={brandPath(brand)}
      className={`group flex flex-col overflow-hidden rounded-3xl border border-ink-100/80 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-secondary-400/70 hover:shadow-lg active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <div className="relative m-1.5 aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-white">
        {showImage ? (
          <img
            src={stage === 0 ? media.src : original}
            srcSet={stage === 0 ? media.srcSet || undefined : undefined}
            sizes={stage === 0 && media.srcSet ? '(min-width: 768px) 20vw, 45vw' : undefined}
            alt={primary}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setStage((s) => (s === 0 && original && original !== media.src ? 1 : 2))}
            className="h-full w-full object-contain p-2 sm:p-3 transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <BrandWordmark name={primary} />
        )}
      </div>
      <div className="px-3 pb-3.5 pt-1.5 text-center">
        <h3 className="truncate font-display text-sm sm:text-base font-semibold text-ink-800 transition-colors group-hover:text-primary-600 dark:text-gray-100">
          {primary}
        </h3>
        <p className="mt-0.5 text-xs text-ink-400">{productsCountLabel(brand.products_count)}</p>
      </div>
    </Link>
  );
}

export function BrandTile({ brand, className = '' }) {
  const { primary, secondary } = brandNames(brand);
  return (
    <Link
      to={brandPath(brand)}
      className={`group card flex flex-col items-center justify-center gap-1.5 px-3 py-3 text-center transition hover:border-primary-300 hover:shadow-md active:scale-[0.98] ${className}`}
    >
      <BrandLogo brand={brand} className="h-14 w-14 text-xl" rounded="rounded-2xl" />
      <span className="w-full font-display text-sm sm:text-base font-bold leading-tight text-ink-800 group-hover:text-primary-600 line-clamp-1 transition-colors dark:text-gray-100">
        {primary}
      </span>
      <span className="text-[11px] font-medium text-primary-600/80 dark:text-primary-300/80">
        {secondary ? `${secondary} · ` : ''}
        {brand.products_count} منتج
      </span>
    </Link>
  );
}
