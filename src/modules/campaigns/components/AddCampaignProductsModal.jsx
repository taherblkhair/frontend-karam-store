import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Modal, LoadingSpinner, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';
import { ImagePreview } from '@shared/components/ImageUpload';
import { useListParams } from '@shared/hooks/useListParams';
import { formatPrice } from '@core/constants';
import { productsApi } from '@modules/products/api/products.api';
import { categoriesApi } from '@modules/categories/api/categories.api';
import { discountPercent } from '@modules/campaigns/utils/campaign';

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/**
 * Pick EXISTING products (search by name / SKU, filter by category), set a campaign price
 * per product or one % for all selected, then link them to the campaign.
 */
export function AddCampaignProductsModal({ open, onClose, existingIds = [], loading, onSubmit, formError }) {
  const { search, setSearch, page, setPage, withExtra } = useListParams();
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState({}); // id → { product, price }
  const [bulkPercent, setBulkPercent] = useState('');

  useEffect(() => {
    if (!open) {
      setSelected({});
      setBulkPercent('');
      setSearch('');
      setCategory('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const params = withExtra({ admin: 'true', limit: 10, ...(category ? { category } : {}) });
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-product-picker', params],
    queryFn: () => productsApi.list(params),
    enabled: open,
    placeholderData: (prev) => prev,
  });
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => categoriesApi.listAll(),
    enabled: open,
    staleTime: 60_000,
  });

  const categories = categoriesData?.data || [];
  const products = data?.data || [];
  const existing = useMemo(() => new Set(existingIds.map(Number)), [existingIds]);
  const selectedList = Object.values(selected);

  const toggle = (p) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else {
        const pct = Number(bulkPercent);
        next[p.id] = {
          product: p,
          price: pct > 0 && pct < 100 ? String(round2(p.price * (1 - pct / 100))) : '',
        };
      }
      return next;
    });

  const setPrice = (id, price) =>
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], price } }));

  const applyPercent = () => {
    const pct = Number(bulkPercent);
    if (!(pct > 0 && pct < 100)) return;
    setSelected((prev) => {
      const next = {};
      for (const [id, row] of Object.entries(prev)) {
        next[id] = { ...row, price: String(round2(row.product.price * (1 - pct / 100))) };
      }
      return next;
    });
  };

  const invalid = selectedList.some((row) => {
    const price = Number(row.price);
    return !(price > 0 && price < Number(row.product.price));
  });

  const submit = () =>
    onSubmit(
      selectedList.map((row) => ({ product_id: row.product.id, campaign_price: Number(row.price) }))
    );

  return (
    <Modal open={open} onClose={onClose} title="إضافة منتجات إلى الحملة" size="xl" alert={formError}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو SKU..." className="flex-1" />
          <select
            className="input w-full sm:w-auto sm:min-w-[10rem]"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            aria-label="التصنيف"
          >
            <option value="">كل التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_ar}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : products.length === 0 ? (
          <EmptyState message="لا توجد منتجات مطابقة" />
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-gray-700 rounded-xl border border-ink-100 dark:border-gray-700">
            {products.map((p) => {
              const inCampaign = existing.has(Number(p.id));
              const checked = Boolean(selected[p.id]);
              return (
                <li key={p.id}>
                  <label
                    className={`flex items-center gap-3 p-2.5 sm:p-3 ${
                      inCampaign ? 'opacity-60' : 'cursor-pointer hover:bg-tertiary-100 dark:hover:bg-gray-700/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300"
                      checked={checked}
                      disabled={inCampaign}
                      onChange={() => toggle(p)}
                    />
                    <ImagePreview url={p.primary_image} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.name_ar}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {p.sku || '—'}
                        {p.category_name ? ` · ${p.category_name}` : ''}
                      </p>
                    </div>
                    <div className="text-sm font-medium whitespace-nowrap">{formatPrice(p.price)}</div>
                    {inCampaign ? (
                      <span className="badge bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                        <Check size={12} /> مضاف
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination pagination={data?.pagination} page={page} onPageChange={setPage} />

        {selectedList.length > 0 ? (
          <div className="card p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium">المنتجات المحددة ({selectedList.length})</p>
                <p className="text-xs text-gray-500">حدد سعر الحملة لكل منتج، أو طبّق نسبة خصم على الجميع</p>
              </div>
              <div className="flex gap-2">
                <input
                  className="input w-28"
                  type="number"
                  min={1}
                  max={99}
                  step="0.01"
                  placeholder="% خصم"
                  value={bulkPercent}
                  onChange={(e) => setBulkPercent(e.target.value)}
                  aria-label="نسبة الخصم للجميع"
                />
                <button type="button" onClick={applyPercent} className="btn-outline text-sm whitespace-nowrap">
                  تطبيق على الكل
                </button>
              </div>
            </div>

            <ul className="space-y-2">
              {selectedList.map(({ product: p, price }) => {
                const valid = Number(price) > 0 && Number(price) < Number(p.price);
                const pct = valid ? discountPercent(p.price, price) : 0;
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-sm flex-1 min-w-[8rem] truncate">{p.name_ar}</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">الأصلي: {formatPrice(p.price)}</span>
                    <input
                      className={`input w-28 ${price && !valid ? 'border-red-400' : ''}`}
                      type="number"
                      min={0.01}
                      step="0.01"
                      placeholder="سعر الحملة"
                      value={price}
                      onChange={(e) => setPrice(p.id, e.target.value)}
                      aria-label={`سعر الحملة لـ ${p.name_ar}`}
                    />
                    <span className={`text-xs font-bold w-16 text-left tabular-nums ${valid ? 'text-green-700 dark:text-green-300' : 'text-red-500'}`}>
                      {valid ? `-${pct}%` : price ? 'غير صالح' : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
            {invalid ? (
              <p className="text-xs text-red-500">سعر الحملة يجب أن يكون أكبر من صفر وأقل من السعر الأصلي</p>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={loading || selectedList.length === 0 || invalid}
          className="btn-primary w-full"
        >
          {loading ? 'جاري الحفظ...' : `إضافة ${selectedList.length || ''} منتج إلى الحملة`}
        </button>
      </div>
    </Modal>
  );
}
