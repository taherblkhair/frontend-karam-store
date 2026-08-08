import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  SlidersHorizontal,
  X,
  Filter,
  Check,
  LayoutGrid,
} from 'lucide-react';
import { storeApi } from '@modules/store/api/store.api';
import StoreLayout from '@shared/layouts/StoreLayout';
import { ProductCard, LoadingSpinner, EmptyState } from '@shared/ui';

const FILTERS_STORAGE_KEY = 'store-filters-open';

/** UI sort → API sortBy / sortOrder */
const SORT_PRESETS = {
  newest: { sortBy: 'created_at', sortOrder: 'DESC' },
  oldest: { sortBy: 'created_at', sortOrder: 'ASC' },
  price_asc: { sortBy: 'price', sortOrder: 'ASC' },
  price_desc: { sortBy: 'price', sortOrder: 'DESC' },
  name: { sortBy: 'name_ar', sortOrder: 'ASC' },
};

const SORT_LABELS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'oldest', label: 'الأقدم' },
  { value: 'price_asc', label: 'السعر: من الأقل للأعلى' },
  { value: 'price_desc', label: 'السعر: من الأعلى للأقل' },
  { value: 'name', label: 'الاسم' },
];

/**
 * Category strip as filter navigation (not product cards).
 * Chip-style controls that filter products below.
 */
function CategoryFilterBar({ categories, activeId, onSelect }) {
  if (!categories?.length) return null;

  const active = categories.find((c) => String(c.id) === String(activeId));
  const isAll = !activeId;


}

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
        <h3 className="font-semibold mb-2 text-sm text-ink-500 dark:text-gray-300">ترتيب</h3>
        <select
          className="input"
          value={filters.sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
        >
          {SORT_LABELS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="font-semibold mb-2 text-sm text-ink-500 dark:text-gray-300">بحث</h3>
        <input
          type="search"
          className="input"
          placeholder="ابحث عن منتج..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
      </div>

      <div>
        <h3 className="font-semibold mb-2 text-sm text-ink-500 dark:text-gray-300">الفئة</h3>
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
        <h3 className="font-semibold mb-2 text-sm text-ink-500 dark:text-gray-300">السعر (د.ل)</h3>
        <div className="flex gap-2">
          <input
            type="number"
            className="input"
            placeholder="من"
            min={0}
            value={filters.min_price}
            onChange={(e) => updateFilter('min_price', e.target.value)}
          />
          <input
            type="number"
            className="input"
            placeholder="إلى"
            min={0}
            value={filters.max_price}
            onChange={(e) => updateFilter('max_price', e.target.value)}
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2 text-sm text-ink-500 dark:text-gray-300">اللون</h3>
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
        <h3 className="font-semibold mb-2 text-sm text-ink-500 dark:text-gray-300">المقاس</h3>
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
      <div>
        <h3 className="font-semibold mb-2 text-sm text-ink-500 dark:text-gray-300">العروض</h3>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            className="rounded border-ink-200 text-primary-600 focus:ring-primary-600"
            checked={filters.featured === 'true'}
            onChange={(e) => updateFilter('featured', e.target.checked ? 'true' : '')}
          />
          عروض مميزة فقط
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm mt-2">
          <input
            type="checkbox"
            className="rounded border-ink-200 text-primary-600 focus:ring-primary-600"
            checked={filters.is_new === 'true'}
            onChange={(e) => updateFilter('is_new', e.target.checked ? 'true' : '')}
          />
          وصل حديثاً فقط
        </label>
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
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, filtersOpen ? '1' : '0');
  }, [filtersOpen]);

  useEffect(() => {
    if (!filtersOpen || window.innerWidth >= 1024) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  const sortKey = params.get('sort') || 'newest';
  const sortPreset = SORT_PRESETS[sortKey] || SORT_PRESETS.newest;

  const filters = {
    search: params.get('search') || '',
    category: params.get('category') || '',
    min_price: params.get('min_price') || '',
    max_price: params.get('max_price') || '',
    color: params.get('color') || '',
    size: params.get('size') || '',
    is_new: params.get('is_new') || '',
    featured: params.get('featured') || '',
    sort: SORT_PRESETS[sortKey] ? sortKey : 'newest',
    page: params.get('page') || '1',
    sortBy: sortPreset.sortBy,
    sortOrder: sortPreset.sortOrder,
  };

  const activeFilterCount = [
    filters.search,
    filters.category,
    filters.min_price,
    filters.max_price,
    filters.color,
    filters.size,
    filters.is_new,
    filters.featured,
    filters.sort !== 'newest' ? filters.sort : '',
  ].filter(Boolean).length;

  const queryParams = useMemo(
    () => ({
      search: filters.search || undefined,
      category: filters.category || undefined,
      min_price: filters.min_price || undefined,
      max_price: filters.max_price || undefined,
      color: filters.color || undefined,
      size: filters.size || undefined,
      is_new: filters.is_new || undefined,
      featured: filters.featured || undefined,
      page: filters.page,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    }),
    [filters]
  );

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => storeApi.products(queryParams),
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
    if (key === 'sort') {
      if (!value || value === 'newest') newParams.delete('sort');
      else newParams.set('sort', value);
    } else if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    if (key !== 'page') newParams.set('page', '1');
    setParams(newParams);
  };

  const clearFilters = () => {
    setParams(new URLSearchParams());
  };

  const closeFilters = () => setFiltersOpen(false);
  const toggleFilters = () => setFiltersOpen((v) => !v);

  const products = productsData?.data || [];
  const pagination = productsData?.pagination;
  const categories = categoriesData?.data || [];
  const activeCategory = categories.find(
    (c) => String(c.id) === String(filters.category)
  );

  const pageHeading =
    filters.featured === 'true'
      ? 'عروض مميزة'
      : filters.is_new === 'true'
        ? 'وصل حديثاً'
        : activeCategory
          ? activeCategory.name_ar
          : 'المنتجات';

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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl text-primary-600">
              {pageHeading}
            </h1>
            {pagination?.total != null && (
              <p className="text-sm text-ink-400 mt-1">
                {pagination.total} منتج
                {activeCategory ? (
                  <span className="text-ink-500">
                    {' '}
                    · مفلتر حسب «{activeCategory.name_ar}»
                  </span>
                ) : null}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="btn-outline text-sm rounded-full">
                مسح ({activeFilterCount})
              </button>
            )}
            <button
              type="button"
              onClick={toggleFilters}
              className={filtersOpen ? 'btn-outline text-sm rounded-full' : 'btn-filter'}
              aria-expanded={filtersOpen}
              aria-controls="store-filters-panel"
            >
              <SlidersHorizontal size={18} strokeWidth={2.25} />
              تصفية وترتيب
              {activeFilterCount > 0 && (
                <span
                  className={`text-xs min-w-[1.25rem] h-5 px-1.5 rounded-full inline-flex items-center justify-center font-semibold ${
                    filtersOpen
                      ? 'bg-primary-600 text-white'
                      : 'bg-secondary-400 text-ink-800'
                  }`}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Category filter — visually separate from product grid */}
        <CategoryFilterBar
          categories={categories}
          activeId={filters.category}
          onSelect={(id) => updateFilter('category', id)}
        />

        {/* Products region */}
        <div className="mb-3 flex items-center gap-2 border-t border-ink-100 pt-5 dark:border-gray-700">
          <LayoutGrid size={16} className="text-ink-400 shrink-0" aria-hidden />
          <h2 className="text-sm font-bold text-ink-700 dark:text-gray-200">
            المنتجات
            {activeCategory ? (
              <span className="font-medium text-ink-400"> · {activeCategory.name_ar}</span>
            ) : null}
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {filtersOpen && (
            <aside
              id="store-filters-panel"
              className="hidden lg:block lg:w-72 shrink-0"
            >
              <div className="card sticky top-20 overflow-hidden border-primary-600/10">
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-ink-100 bg-primary-600 text-white">
                  <div className="flex items-center gap-2 font-semibold">
                    <SlidersHorizontal size={18} />
                    تصفية وترتيب
                  </div>
                  <button
                    type="button"
                    onClick={closeFilters}
                    className="inline-flex items-center gap-1.5 text-sm text-white/90 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/10 transition"
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

          {filtersOpen && (
            <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true">
              <button
                type="button"
                className="absolute inset-0 bg-ink-800/50 backdrop-blur-[2px]"
                aria-label="إغلاق الفلتر"
                onClick={closeFilters}
              />
              <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl flex flex-col translate-x-0 transition-transform duration-300">
                <div className="flex items-center justify-between gap-2 px-4 py-3 bg-primary-600 text-white">
                  <div className="flex items-center gap-2 font-semibold text-lg">
                    <SlidersHorizontal size={20} />
                    تصفية وترتيب
                  </div>
                  <button
                    type="button"
                    onClick={closeFilters}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-3 py-1.5 text-sm hover:bg-white/10 transition"
                    aria-label="إغلاق الفلتر"
                  >
                    <X size={18} />
                    إغلاق
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <FilterFields {...filterProps} />
                </div>
                <div className="p-4 border-t border-ink-100 dark:border-gray-700 flex gap-2 safe-pb">
                  {activeFilterCount > 0 && (
                    <button type="button" onClick={clearFilters} className="btn-outline flex-1 rounded-full">
                      مسح
                    </button>
                  )}
                  <button type="button" onClick={closeFilters} className="btn-primary flex-1 rounded-full">
                    عرض النتائج
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {isLoading ? (
              <LoadingSpinner />
            ) : products.length === 0 ? (
              <EmptyState message="لا توجد منتجات مطابقة للفلتر" />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
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
                        onClick={() => updateFilter('page', String(i + 1))}
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
        </div>
      </div>
    </StoreLayout>
  );
}
