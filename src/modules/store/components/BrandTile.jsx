import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@modules/store/api/store.api';
import { OptimizedImage } from '@shared/components/OptimizedImage';
import { normalizeArabic } from '@modules/store/components/SearchableSelect';

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

export function BrandTile({ brand, className = '' }) {
  const { primary, secondary } = brandNames(brand);
  return (
    <Link
      to={brandPath(brand)}
      className={`group card flex min-h-[5.5rem] flex-col items-center justify-center gap-1 px-3 py-3 text-center transition hover:border-primary-300 hover:shadow-md active:scale-[0.98] ${className}`}
    >
      {brand.logo ? (
        <OptimizedImage
          src={brand.logo}
          alt={primary}
          className="h-10 w-full"
          objectFit="contain"
          sizes="120px"
          widths={[400]}
        />
      ) : (
        <span className="font-display text-base sm:text-lg font-bold leading-tight text-ink-800 group-hover:text-primary-600 line-clamp-1 transition-colors dark:text-gray-100">
          {primary}
        </span>
      )}
      {secondary && !brand.logo && (
        <span className="text-xs text-ink-500 line-clamp-1">{secondary}</span>
      )}
      <span className="text-[11px] font-medium text-primary-600/80 dark:text-primary-300/80">
        {brand.products_count} منتج
      </span>
    </Link>
  );
}
