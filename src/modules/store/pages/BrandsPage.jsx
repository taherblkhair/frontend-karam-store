import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import StoreLayout from '@shared/layouts/StoreLayout';
import { LoadingSpinner } from '@shared/ui';
import {
  BrandTile,
  StoreSearchField,
  filterBrands,
  useStoreBrands,
} from '@modules/store/components/BrandTile';

export default function BrandsPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const searchRef = useRef(null);
  const { data: brands = [], isLoading, isError } = useStoreBrands();
  const results = filterBrands(brands, query);

  useEffect(() => {
    if (window.matchMedia('(hover: hover)').matches) searchRef.current?.focus();
  }, []);

  // replace: typing must not stack one history entry per keystroke (phone back button)
  const setQuery = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <nav className="mb-3 text-sm text-ink-400" aria-label="مسار التنقل">
          <Link to="/" className="hover:text-primary-600">الرئيسية</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-600 dark:text-gray-300">البراندات</span>
        </nav>

        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl text-primary-600">البراندات</h1>
          {brands.length > 0 && <p className="text-sm text-ink-400">{brands.length} براند</p>}
        </div>

        <StoreSearchField
          ref={searchRef}
          value={query}
          onChange={setQuery}
          placeholder="ابحث عن البراند…"
          className="mb-5 sm:max-w-md"
        />

        {isLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <p className="py-16 text-center text-ink-500">تعذر تحميل البراندات، حاول مرة أخرى</p>
        ) : results.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-ink-600 mb-3">لا يوجد براند مطابق للبحث</p>
            {query && (
              <button type="button" onClick={() => setQuery('')} className="btn-outline rounded-full text-sm">
                عرض كل البراندات
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {results.map((brand) => (
              <BrandTile key={brand.id} brand={brand} />
            ))}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
