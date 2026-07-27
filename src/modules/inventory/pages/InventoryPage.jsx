import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Package } from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { useListParams } from '@shared/hooks/useListParams';
import { useConfirm } from '@shared/hooks/useConfirm';
import { inventoryApi } from '@modules/inventory/api/inventory.api';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';

const MOVEMENT_LABELS = {
  in: 'إضافة',
  out: 'خصم',
  adjustment: 'تعديل / جرد',
  sale: 'بيع',
  purchase: 'شراء',
  return: 'مرتجع',
  cancel: 'إلغاء',
};

const TABS = [
  { id: 'levels', label: 'المخزون الحالي' },
  { id: 'manage', label: 'تعديل وحركات' },
];

export default function InventoryPage() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('levels');
  const [adjustForm, setAdjustForm] = useState({ product_id: '', quantity: '', type: 'in', notes: '' });
  const { search, setSearch, page, setPage, params } = useListParams();

  const { data: levelsData, isLoading: levelsLoading } = useQuery({
    queryKey: ['inventory-levels', params],
    queryFn: () => inventoryApi.levels(params),
    enabled: tab === 'levels',
  });

  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ['inventory-movements', params],
    queryFn: () => inventoryApi.movements(params),
    enabled: tab === 'manage',
  });

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => inventoryApi.lowStock(),
  });

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-lookup'],
    queryFn: () => inventoryApi.productsLookup(),
    enabled: tab === 'manage',
  });

  const adjustMutation = useMutation({
    mutationFn: inventoryApi.adjust,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['inventory-movements']);
      queryClient.invalidateQueries(['inventory-levels']);
      queryClient.invalidateQueries(['low-stock']);
      notifySuccess(res);
      setAdjustForm({ product_id: '', quantity: '', type: 'in', notes: '' });
    },
    onError: notifyError,
  });

  const levels = levelsData?.data || [];
  const rows = movements?.data || [];
  const products = productsData?.data || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold">إدارة المخزون</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={tab === 'levels' ? 'بحث بالمنتج أو المتغير...' : 'بحث في الحركات...'}
          />
          <Link to="/admin/inventory/stocktaking" className="btn-primary">
            <ClipboardList size={18} /> جرد المخزون
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setPage(1);
            }}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {lowStock?.data?.length > 0 && (
        <div className="card p-4 mb-6 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <h2 className="font-bold text-orange-700 mb-3">مخزون منخفض ({lowStock.data.length})</h2>
          <div className="grid md:grid-cols-2 gap-2">
            {lowStock.data.slice(0, 6).map((item) => (
              <div key={item.id} className="text-sm flex justify-between gap-2">
                <span>
                  {item.product_name}
                  {(item.color_name || item.size_name)
                    ? ` — ${[item.color_name, item.size_name].filter(Boolean).join(' / ')}`
                    : ''}
                </span>
                <span className="text-red-600 font-bold shrink-0">{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'levels' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
            <Package size={18} className="text-primary-600" />
            <div>
              <h2 className="font-bold">المخزون الحالي</h2>
              <p className="text-xs text-gray-500">كل صنف ومتغير مع الكمية المتوفرة الآن</p>
            </div>
          </div>

          {levelsLoading ? (
            <LoadingSpinner />
          ) : !levels.length ? (
            <EmptyState message="لا توجد أصناف في المخزون" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-right p-4">المنتج</th>
                    <th className="text-right p-4">المتغير</th>
                    <th className="text-right p-4">SKU</th>
                    <th className="text-right p-4">الكمية الحالية</th>
                  </tr>
                </thead>
                <tbody>
                  {levels.map((row) => {
                    const low = Number(row.quantity) <= Number(row.min_stock_level);
                    const key = `${row.product_id}-${row.variant_id || 'p'}`;
                    return (
                      <tr key={key} className="border-t dark:border-gray-700">
                        <td className="p-4 font-medium">{row.product_name}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-300">
                          {row.variant_info || '—'}
                        </td>
                        <td className="p-4 text-xs text-gray-400">
                          {row.variant_sku || row.product_sku || '—'}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex min-w-[2.5rem] justify-center px-2.5 py-1 rounded-lg font-bold ${
                              low
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                : Number(row.quantity) === 0
                                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            }`}
                          >
                            {row.quantity}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-4">
            <Pagination
              pagination={levelsData?.pagination}
              page={page}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {tab === 'manage' && (
        <>
          <div className="card p-6 mb-6">
            <h2 className="font-bold mb-4">تعديل المخزون</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const product = products.find((p) => String(p.id) === String(adjustForm.product_id));
                const actionLabel = adjustForm.type === 'out' ? 'خصم' : 'إضافة';
                const ok = await confirm({
                  title: `${actionLabel} مخزون`,
                  message: `تأكيد ${actionLabel} كمية ${adjustForm.quantity} من «${product?.name_ar || 'المنتج'}»؟`,
                  confirmText: 'تطبيق',
                  variant: adjustForm.type === 'out' ? 'danger' : 'warning',
                });
                if (!ok) return;
                adjustMutation.mutate({
                  product_id: parseInt(adjustForm.product_id, 10),
                  quantity: parseInt(adjustForm.quantity, 10),
                  type: adjustForm.type,
                  notes: adjustForm.notes,
                });
              }}
              className="grid md:grid-cols-4 gap-4"
            >
              <select
                className="input"
                required
                value={adjustForm.product_id}
                onChange={(e) => setAdjustForm({ ...adjustForm, product_id: e.target.value })}
              >
                <option value="">اختر المنتج</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_ar}
                    {p.sku ? ` — ${p.sku}` : ''}
                  </option>
                ))}
              </select>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="الكمية"
                required
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
              />
              <select
                className="input"
                value={adjustForm.type}
                onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
              >
                <option value="in">إضافة</option>
                <option value="out">خصم</option>
              </select>
              <button type="submit" className="btn-primary" disabled={adjustMutation.isPending}>
                تطبيق
              </button>
            </form>
          </div>

          <div className="card overflow-hidden">
            <h2 className="font-bold p-4 border-b dark:border-gray-700">سجل الحركات</h2>
            {movementsLoading ? (
              <LoadingSpinner />
            ) : rows.length === 0 ? (
              <EmptyState message="لا توجد حركات" />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-right p-4">المنتج</th>
                    <th className="text-right p-4">النوع</th>
                    <th className="text-right p-4">الكمية</th>
                    <th className="text-right p-4">قبل</th>
                    <th className="text-right p-4">بعد</th>
                    <th className="text-right p-4">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id} className="border-t dark:border-gray-700">
                      <td className="p-4">{m.product_name}</td>
                      <td className="p-4">{MOVEMENT_LABELS[m.type] || m.type}</td>
                      <td className="p-4">{m.quantity}</td>
                      <td className="p-4">{m.previous_qty}</td>
                      <td className="p-4">{m.new_qty}</td>
                      <td className="p-4">{new Date(m.created_at).toLocaleDateString('ar')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pagination pagination={movements?.pagination} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
