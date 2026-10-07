import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import StoreLayout from '@shared/layouts/StoreLayout';
import { ProductCard, LoadingSpinner, EmptyState } from '@shared/ui';
import { BrandLogo } from '@shared/components/BrandLogo';
import { storeApi } from '@modules/store/api/store.api';
import {
  StoreSearchField,
  brandNames,
  useStoreBrands,
} from '@modules/store/components/BrandTile';

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

function decodeSlug(raw) {
  try {
    return decodeURIComponent(raw || '');
  } catch {
    return raw || '';
  }
}

export default function BrandPage() {
  const { slug: rawSlug } = useParams();
  const slug = decodeSlug(rawSlug);
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);
  const [searchInput, setSearchInput] = useState(query);

  const { data: brands = [], isLoading: brandsLoading } = useStoreBrands();
  const brand = brands.find((b) => b.slug === slug || String(b.id) === slug) || null;

  useEffect(() => {
    setSearchInput(query);
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced so the request fires after a short pause, not on every keystroke.
  useEffect(() => {
    if (searchInput.trim() === query) return undefined;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (searchInput.trim()) next.set('q', searchInput.trim());
      else next.delete('q');
      next.delete('page');
      setParams(next, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: productsData, isLoading: productsLoading, isFetching } = useQuery({
    queryKey: ['brand-products', brand?.id, query, page],
    queryFn: () =>
      storeApi.products({
        brand: brand.id,
        search: query || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: Boolean(brand?.id),
    placeholderData: (prev) => prev,
  });

  const goToPage = (n) => {
    const next = new URLSearchParams(params);
    if (n > 1) next.set('page', String(n));
    else next.delete('page');
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (brandsLoading) {
    return (
      <StoreLayout>
        <LoadingSpinner />
      </StoreLayout>
    );
  }

  if (!brand) {
    return (
      <StoreLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-ink-600 mb-4">البراند غير موجود أو لا توجد له منتجات حالياً</p>
          <Link to="/brands" className="btn-primary rounded-full">
            تصفح كل البراندات
          </Link>
        </div>
      </StoreLayout>
    );
  }

  const { primary, secondary } = brandNames(brand);
  const products = productsData?.data || [];
  const pagination = productsData?.pagination;
  const searching = Boolean(query);

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <nav className="mb-3 text-sm text-ink-400" aria-label="مسار التنقل">
          <Link to="/" className="hover:text-primary-600">الرئيسية</Link>
          <span className="mx-1.5">/</span>
          <Link to="/brands" className="hover:text-primary-600">البراندات</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-600 dark:text-gray-300">{primary}</span>
        </nav>

        <header className="mb-5 sm:mb-6 flex items-center gap-4">
          <BrandLogo
            brand={brand}
            className="h-20 w-20 sm:h-24 sm:w-24 text-3xl border border-ink-100 shadow-sm dark:border-gray-700"
            rounded="rounded-3xl"
          />
          <div className="min-w-0">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary-600 leading-tight">
              {primary}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {secondary && <span>{secondary} · </span>}
              {brand.products_count} منتج
            </p>
          </div>
        </header>

        <div className="mb-4 flex flex-col gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
          <h2 className="text-base sm:text-lg font-bold text-ink-700 dark:text-gray-200">
            منتجات <bdi>{primary}</bdi>
            {searching && pagination?.total != null && (
              <span className="font-medium text-ink-400"> · {pagination.total} نتيجة</span>
            )}
          </h2>
          <StoreSearchField
            value={searchInput}
            onChange={setSearchInput}
            placeholder={`ابحث في منتجات ${primary}…`}
            className="sm:w-80"
          />
        </div>

        {productsLoading ? (
          <LoadingSpinner />
        ) : products.length === 0 ? (
          <div className="py-4 text-center">
            <EmptyState
              message={
                searching
                  ? `لا توجد منتجات مطابقة لـ «${query}» في ${primary}`
                  : `لا توجد منتجات حالياً لـ ${primary}`
              }
            />
            {searching && (
              <button type="button" onClick={() => setSearchInput('')} className="btn-outline -mt-10 rounded-full text-sm">
                عرض كل منتجات {primary}
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 transition-opacity ${
                isFetching ? 'opacity-60' : ''
              }`}
            >
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {pagination && pagination.pages > 1 && (
              <div className="flex flex-wrap justify-center gap-2 mt-8">
                {Array.from({ length: pagination.pages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToPage(i + 1)}
                    className={`min-w-[2.5rem] px-3 py-2 rounded-full text-sm font-medium transition ${
                      pagination.page === i + 1
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-white border border-ink-100 text-ink-800 hover:border-primary-600/40'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </StoreLayout>
  );
}
