import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { storeApi } from '@modules/store/api/store.api';
import StoreLayout from '@shared/layouts/StoreLayout';
import { ProductCard, LoadingSpinner, EmptyState } from '@shared/ui';

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();

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

  const products = productsData?.data || [];
  const pagination = productsData?.pagination;

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">المنتجات</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 space-y-6">
            <div className="card p-4">
              <h3 className="font-bold mb-3">بحث</h3>
              <input
                type="text"
                className="input"
                placeholder="ابحث..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </div>

            <div className="card p-4">
              <h3 className="font-bold mb-3">الفئة</h3>
              <select className="input" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
                <option value="">الكل</option>
                {categoriesData?.data?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_ar}</option>
                ))}
              </select>
            </div>

            <div className="card p-4">
              <h3 className="font-bold mb-3">السعر</h3>
              <div className="flex gap-2">
                <input type="number" className="input" placeholder="من" value={filters.min_price} onChange={(e) => updateFilter('min_price', e.target.value)} />
                <input type="number" className="input" placeholder="إلى" value={filters.max_price} onChange={(e) => updateFilter('max_price', e.target.value)} />
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-bold mb-3">اللون</h3>
              <select className="input" value={filters.color} onChange={(e) => updateFilter('color', e.target.value)}>
                <option value="">الكل</option>
                {colorsData?.data?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_ar}</option>
                ))}
              </select>
            </div>

            <div className="card p-4">
              <h3 className="font-bold mb-3">المقاس</h3>
              <select className="input" value={filters.size} onChange={(e) => updateFilter('size', e.target.value)}>
                <option value="">الكل</option>
                {sizesData?.data?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {isLoading ? <LoadingSpinner /> : products.length === 0 ? (
              <EmptyState message="لا توجد منتجات" />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: pagination.pages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => updateFilter('page', String(i + 1))}
                        className={`px-4 py-2 rounded-lg ${pagination.page === i + 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
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
