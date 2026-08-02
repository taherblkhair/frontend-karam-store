import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import { storeApi } from '@modules/store/api/store.api';
import StoreLayout from '@shared/layouts/StoreLayout';
import { ProductCard, LoadingSpinner, EmptyState } from '@shared/ui';
import { CategoryCard } from '@modules/store/components/CategoryCard';

const FILTERS_STORAGE_KEY = 'store-filters-open';

function FilterFields({
  filters,
  categories,
  colorsData,
  sizesData,
  updateFilter,
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-bold mb-2 text-sm text-gray-600 dark:text-gray-300">بحث</h3>
        <input
          type="text"
          className="input"
          placeholder="ابحث..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
      </div>

      <div>
        <h3 className="font-bold mb-2 text-sm text-gray-600 dark:text-gray-300">الفئة</h3>
        <select
          className="input"
          value={filters.category}
          onChange={(e) => updateFilter('category', e.target.value)}
        >
          <option value="">الكل</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_ar}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="font-bold mb-2 text-sm text-gray-600 dark:text-gray-300">السعر</h3>
        <div className="flex gap-2">
          <input
            type="number"
            className="input"
            placeholder="من"
            value={filters.min_price}
            onChange={(e) => updateFilter('min_price', e.target.value)}
          />
          <input
            type="number"
            className="input"
            placeholder="إلى"
            value={filters.max_price}
            onChange={(e) => updateFilter('max_price', e.target.value)}
          />
        </div>
      </div>

      <div>
        <h3 className="font-bold mb-2 text-sm text-gray-600 dark:text-gray-300">اللون</h3>
        <select
          className="input"
          value={filters.color}
          onChange={(e) => updateFilter('color', e.target.value)}
        >
          <option value="">الكل</option>
          {colorsData?.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_ar}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="font-bold mb-2 text-sm text-gray-600 dark:text-gray-300">المقاس</h3>
        <select
          className="input"
          value={filters.size}
          onChange={(e) => updateFilter('size', e.target.value)}
        >
          <option value="">الكل</option>
          {sizesData?.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (saved === '0') return false;
    if (saved === '1') return true;
    // Mobile: closed by default; desktop sidebar open
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, filtersOpen ? '1' : '0');
  }, [filtersOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!filtersOpen || window.innerWidth >= 1024) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  const filters = {
    search: params.get('search') || '',
    category: params.get('category') || '',
    min_price: params.get('min_price') || '',
    max_price: params.get('max_price') || '',
    color: params.get('color') || '',
    size: params.get('size') || '',
    is_new: params.get('is_new') || '',
    page: params.get('page') || '1',
  };

  const activeFilterCount = [
    filters.search,
    filters.category,
    filters.min_price,
    filters.max_price,
    filters.color,
    filters.size,
    filters.is_new,
  ].filter(Boolean).length;

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => storeApi.products(filters),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => storeApi.categories(),
  });

  const { data: colorsData } = useQuery({
    queryKey: ['colors'],
    queryFn: () => storeApi.colors(),
  });

  const { data: sizesData } = useQuery({
    queryKey: ['sizes'],
    queryFn: () => storeApi.sizes(),
  });

  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(params);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    newParams.set('page', '1');
    setParams(newParams);
  };

  const clearFilters = () => {
    setParams(new URLSearchParams());
  };

  const closeFilters = () => setFiltersOpen(false);
  const openFilters = () => setFiltersOpen(true);

  const products = productsData?.data || [];
  const pagination = productsData?.pagination;
  const categories = categoriesData?.data || [];

  const filterProps = {
    filters,
    categories,
    colorsData,
    sizesData,
    updateFilter,
  };

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">المنتجات</h1>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="btn-outline text-sm">
                مسح ({activeFilterCount})
              </button>
            )}
            {/* Compact opener only when filters are closed */}
            {!filtersOpen && (
              <button
                type="button"
                onClick={openFilters}
                className="btn-secondary text-sm inline-flex items-center gap-2"
              >
                <Filter size={16} />
                الفلاتر
                {activeFilterCount > 0 && (
                  <span className="bg-primary-600 text-white text-xs min-w-[1.25rem] h-5 px-1 rounded-full inline-flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {categories.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">التصنيفات</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  active={String(filters.category) === String(cat.id)}
                />
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop: inline sidebar with close inside panel */}
          {filtersOpen && (
            <aside className="hidden lg:block lg:w-72 shrink-0">
              <div className="card sticky top-20 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                  <div className="flex items-center gap-2 font-bold">
                    <Filter size={18} className="text-primary-600" />
                    الفلاتر
                  </div>
                  <button
                    type="button"
                    onClick={closeFilters}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    aria-label="إغلاق الفلتر"
                  >
                    <X size={16} />
                    إغلاق
                  </button>
                </div>
                <div className="p-4">
                  <FilterFields {...filterProps} />
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="btn-outline w-full mt-5 text-sm"
                    >
                      مسح كل الفلاتر
                    </button>
                  )}
                </div>
              </div>
            </aside>
          )}

          {/* Mobile / tablet: drawer with close inside */}
          {filtersOpen && (
            <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true">
              <button
                type="button"
                className="absolute inset-0 bg-black/45"
                aria-label="إغلاق الفلتر"
                onClick={closeFilters}
              />
              <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white dark:bg-gray-900 shadow-xl flex flex-col animate-in">
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b dark:border-gray-700">
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <Filter size={20} className="text-primary-600" />
                    الفلاتر
                  </div>
                  <button
                    type="button"
                    onClick={closeFilters}
                    className="inline-flex items-center gap-1.5 btn-outline text-sm py-2"
                    aria-label="إغلاق الفلتر"
                  >
                    <X size={18} />
                    إغلاق
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <FilterFields {...filterProps} />
                </div>
                <div className="p-4 border-t dark:border-gray-700 flex gap-2">
                  {activeFilterCount > 0 && (
                    <button type="button" onClick={clearFilters} className="btn-outline flex-1">
                      مسح
                    </button>
                  )}
                  <button type="button" onClick={closeFilters} className="btn-primary flex-1">
                    عرض النتائج
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1">
            {isLoading ? (
              <LoadingSpinner />
            ) : products.length === 0 ? (
              <EmptyState message="لا توجد منتجات" />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: pagination.pages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => updateFilter('page', String(i + 1))}
                        className={`px-4 py-2 rounded-lg ${
                          pagination.page === i + 1
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700'
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
        </div>
      </div>
    </StoreLayout>
  );
}
