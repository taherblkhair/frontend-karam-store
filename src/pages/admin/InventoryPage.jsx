import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifySuccess, notifyError } from '../../utils/notify';
import { useListParams } from '../../hooks/useListParams';
import api from '../../api/axios';
import { LoadingSpinner, EmptyState } from '../../components/ui';
import { SearchInput, Pagination } from '../../components/ListControls';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [adjustForm, setAdjustForm] = useState({ product_id: '', quantity: '', type: 'in', notes: '' });
  const { search, setSearch, page, setPage, params } = useListParams();

  const { data: movements, isLoading } = useQuery({
    queryKey: ['inventory-movements', params],
    queryFn: () => api.get('/inventory/movements', { params }),
  });

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => api.get('/inventory/low-stock'),
  });

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-lookup'],
    queryFn: () => api.get('/products', { params: { admin: 'true', limit: 200 } }),
  });

  const adjustMutation = useMutation({
    mutationFn: (data) => api.post('/inventory/adjust', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['inventory-movements']);
      queryClient.invalidateQueries(['low-stock']);
      notifySuccess(res);
      setAdjustForm({ product_id: '', quantity: '', type: 'in', notes: '' });
    },
    onError: notifyError,
  });

  const rows = movements?.data || [];
  const products = productsData?.data || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">إدارة المخزون</h1>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في الحركات بالمنتج أو النوع..." />
      </div>

      {lowStock?.data?.length > 0 && (
        <div className="card p-4 mb-6 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <h2 className="font-bold text-orange-700 mb-3">مخزون منخفض ({lowStock.data.length})</h2>
          <div className="grid md:grid-cols-2 gap-2">
            {lowStock.data.slice(0, 6).map((item) => (
              <div key={item.id} className="text-sm flex justify-between">
                <span>{item.product_name}</span>
                <span className="text-red-600 font-bold">{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6 mb-6">
        <h2 className="font-bold mb-4">تعديل المخزون</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
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
        {isLoading ? (
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
                  <td className="p-4">{m.type}</td>
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
    </div>
  );
}
