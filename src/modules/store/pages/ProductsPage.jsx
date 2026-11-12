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
import { storeSettingsQuery } from '@modules/store/api/storeSettings.query';
import { useStoreBrands, productsCountLabel } from '@modules/store/components/BrandTile';
import { brandFromSettings } from '@modules/store/utils/brand';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import StoreLayout from '@shared/layouts/StoreLayout';
import { ProductCard, LoadingSpinner, EmptyState } from '@shared/ui';
import {
  LoadMoreFooter,
  ProductCardSkeletons,
  useInfiniteProducts,
} from '@modules/store/components/LoadMoreProducts';

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
  const chip = (active) =>
    `inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
      active
        ? 'border-primary-600 bg-primary-600 text-white'
        : 'border-ink-100 bg-white text-ink-700 hover:border-primary-600/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
    }`;
  return (
    <nav aria-label="التصنيفات" className="-mx-4 mb-5 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-2 snap-x scrollbar-none">
      <button type="button" onClick={() => onSelect('')} className={chip(!activeId)} aria-pressed={!activeId}>
        {!activeId ? <Check size={15} aria-hidden /> : null} الكل
      </button>
      {categories.map((c) => {
        const active = String(c.id) === String(activeId);
        return (
          <button key={c.id} type="button" onClick={() => onSelect(active ? '' : String(c.id))} className={chip(active)} aria-pressed={active}>
            {active ? <Check size={15} aria-hidden /> : null} {c.name_ar}
          </button>
        );
      })}
    </nav>
  );
}

/** One removable chip per active filter, so a visitor sees (and undoes) what narrows the list. */
function ActiveFilterChips({ chips, onClear }) {
  if (!chips.length) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="الفلاتر المطبقة">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onRemove}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-200"
          aria-label={`إزالة فلتر ${c.label}`}
        >
          {c.label} <X size={14} aria-hidden />
        </button>
      ))}
      {chips.length > 1 ? (
        <button type="button" onClick={onClear} className="text-sm font-medium text-ink-500 underline underline-offset-4 hover:text-ink-700">
          مسح الكل
        </button>
      ) : null}
    </div>
  );
}

function FilterFields({
  filters,
  categories,
  brands,
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

      {brands.length ? (
        <div>
          <h3 className="font-semibold mb-2 text-sm text-ink-500 dark:text-gray-300">البراند</h3>
          <select
            className="input"
            value={filters.brand}
            onChange={(e) => updateFilter('brand', e.target.value)}
            aria-label="البراند"
          >
            <option value="">الكل</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name_en || b.name_ar}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <h3 className="font-semibold mb-2 text-sm text-ink-500 dark:text-gray-300">السعر (د.ل)</h3>
        <p className="text-xs text-ink-400 mb-2">حسب السعر الحالي، شامل تخفيضات الحملات</p>
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
        <h3 className="font-semibold mb-2 text-sm text-ink-500 dark:text-gray-300">التوفر والعروض</h3>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            className="rounded border-ink-200 text-primary-600 focus:ring-primary-600"
            checked={filters.in_stock === 'true'}
            onChange={(e) => updateFilter('in_stock', e.target.checked ? 'true' : '')}
          />
          المتوفر فقط
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm mt-2">
          <input
            type="checkbox"
            className="rounded border-ink-200 text-primary-600 focus:ring-primary-600"
            checked={filters.on_sale === 'true'}
            onChange={(e) => updateFilter('on_sale', e.target.checked ? 'true' : '')}
          />
          عليه خصم
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm mt-2">
          <input
            type="checkbox"
            className="rounded border-ink-200 text-primary-600 focus:ring-primary-600"
            checked={filters.featured === 'true'}
            onChange={(e) => updateFilter('featured', e.target.checked ? 'true' : '')}
          />
          اخترنا لك
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
    brand: params.get('brand') || '',
    in_stock: params.get('in_stock') || '',
    on_sale: params.get('on_sale') || '',
    sort: SORT_PRESETS[sortKey] ? sortKey : 'newest',
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
    filters.brand,
    filters.in_stock,
    filters.on_sale,
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
      brand: filters.brand || undefined,
      in_stock: filters.in_stock || undefined,
      on_sale: filters.on_sale || undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params]
  );

  const {
    products,
    total,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteProducts(['products'], queryParams);

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
    newParams.delete('page');
    setParams(newParams);
  };

  const clearFilters = () => {
    setParams(new URLSearchParams());
  };

  const closeFilters = () => setFiltersOpen(false);
  const toggleFilters = () => setFiltersOpen((v) => !v);

  const categories = categoriesData?.data || [];
  const activeCategory = categories.find(
    (c) => String(c.id) === String(filters.category)
  );

  const { data: brands = [] } = useStoreBrands();
  const activeBrand = brands.find((b) => String(b.id) === String(filters.brand));
  const { data: settingsData } = useQuery({ ...storeSettingsQuery, staleTime: 60_000 });
  const brandName = brandFromSettings(settingsData?.data || {});

  const pageHeading =
    filters.search
      ? `نتائج البحث عن «${filters.search}»`
      : filters.on_sale === 'true'
      ? 'العروض والتخفيضات'
      : filters.featured === 'true'
      ? 'اخترنا لك'
      : filters.is_new === 'true'
        ? 'وصل حديثاً'
        : activeCategory
          ? activeCategory.name_ar
          : 'المنتجات';

  usePageMeta({ title: `${pageHeading} | ${brandName.full}` });

  const sortLabel = SORT_LABELS.find((s) => s.value === filters.sort)?.label;
  const activeChips = [
    filters.search && { key: 'search', label: `بحث: ${filters.search}`, onRemove: () => updateFilter('search', '') },
    activeCategory && { key: 'category', label: activeCategory.name_ar, onRemove: () => updateFilter('category', '') },
    activeBrand && { key: 'brand', label: activeBrand.name_en || activeBrand.name_ar, onRemove: () => updateFilter('brand', '') },
    (filters.min_price || filters.max_price) && {
      key: 'price',
      label: `السعر ${filters.min_price || 0}–${filters.max_price || '∞'} د.ل`,
      onRemove: () => {
        const next = new URLSearchParams(params);
        next.delete('min_price');
        next.delete('max_price');
        setParams(next);
      },
    },
    filters.color && { key: 'color', label: `اللون: ${colorsData?.data?.find((c) => String(c.id) === filters.color)?.name_ar || ''}`, onRemove: () => updateFilter('color', '') },
    filters.size && { key: 'size', label: `المقاس: ${sizesData?.data?.find((s) => String(s.id) === filters.size)?.name || ''}`, onRemove: () => updateFilter('size', '') },
    filters.in_stock === 'true' && { key: 'in_stock', label: 'المتوفر فقط', onRemove: () => updateFilter('in_stock', '') },
    filters.on_sale === 'true' && { key: 'on_sale', label: 'عليه خصم', onRemove: () => updateFilter('on_sale', '') },
    filters.featured === 'true' && { key: 'featured', label: 'اخترنا لك', onRemove: () => updateFilter('featured', '') },
    filters.is_new === 'true' && { key: 'is_new', label: 'وصل حديثاً', onRemove: () => updateFilter('is_new', '') },
    filters.sort !== 'newest' && { key: 'sort', label: `ترتيب: ${sortLabel}`, onRemove: () => updateFilter('sort', '') },
  ].filter(Boolean);

  const filterProps = {
    filters,
    categories,
    brands,
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
            {/* Line height is reserved while loading so the filters / grid don't jump */}
            <p className="text-sm text-ink-400 mt-1">
              {total != null ? (
                <>
                  {productsCountLabel(total)}
                  {activeCategory ? (
                    <span className="text-ink-500">
                      {' '}
                      · مفلتر حسب «{activeCategory.name_ar}»
                    </span>
                  ) : null}
                </>
              ) : (
                '\u00A0'
              )}
            </p>
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

        <ActiveFilterChips chips={activeChips} onClear={clearFilters} />

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
                    {total != null ? (total ? `عرض ${productsCountLabel(total)}` : 'لا توجد نتائج') : 'عرض النتائج'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {isLoading ? (
              <LoadingSpinner />
            ) : products.length === 0 ? (
              <div className="py-12 text-center">
                <EmptyState message={filters.search ? `لا توجد نتائج لـ «${filters.search}»` : 'لا توجد منتجات مطابقة للفلتر'} />
                {activeFilterCount > 0 ? (
                  <button type="button" onClick={clearFilters} className="btn-outline rounded-full mt-4">
                    مسح الفلاتر وعرض كل المنتجات
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                  {isFetchingNextPage && <ProductCardSkeletons count={6} />}
                </div>
                <LoadMoreFooter
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                  shown={products.length}
                  total={total}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
