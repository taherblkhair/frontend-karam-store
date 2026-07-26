import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { useListParams } from '@shared/hooks/useListParams';
import { useConfirm } from '@shared/hooks/useConfirm';
import { purchasesApi } from '@modules/purchases/api/purchases.api';
import { LoadingSpinner, Modal, FieldError, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';
import { formatPrice } from '@core/constants';

const emptyItem = () => ({ product_id: '', quantity: '', unit_cost: '' });
const emptyForm = () => ({ supplier_id: '', items: [emptyItem()] });

export default function PurchasesPage() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();
  const { search, setSearch, page, setPage, params } = useListParams();

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', params],
    queryFn: () => purchasesApi.list(params),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => purchasesApi.suppliersAll(),
  });

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-lookup'],
    queryFn: () => purchasesApi.productsLookup(),
  });

  const createMutation = useMutation({
    mutationFn: purchasesApi.create,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['purchases']);
      queryClient.invalidateQueries(['inventory']);
      closeModal();
      notifySuccess(res);
    },
    onError: (err) => {
      applyApiError(err);
      notifyError(err);
    },
  });

  const products = productsData?.data || [];

  const updateItem = (idx, field, value) => {
    const items = form.items.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    setForm({ ...form, items });
  };

  const removeItem = (idx) => {
    if (form.items.length === 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm());
    clearErrors();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    if (!form.supplier_id) {
      notifyError({ message: 'اختر المورد' });
      return;
    }

    const items = form.items
      .map((item) => ({
        product_id: item.product_id ? parseInt(item.product_id, 10) : null,
        quantity: item.quantity ? parseInt(item.quantity, 10) : null,
        unit_cost: item.unit_cost !== '' ? parseFloat(item.unit_cost) : null,
      }))
      .filter((item) => item.product_id);

    if (!items.length) {
      notifyError({ message: 'اختر منتجاً واحداً على الأقل' });
      return;
    }

    const invalid = items.find(
      (item) => !item.product_id || !item.quantity || item.quantity < 1 || item.unit_cost == null || item.unit_cost < 0
    );
    if (invalid) {
      notifyError({ message: 'تحقق من الكمية وتكلفة الوحدة لكل منتج' });
      return;
    }

    const ok = await confirm({
      title: 'تأكيد فاتورة الشراء',
      message: `سيتم تسجيل فاتورة بـ ${items.length} بند/بنود وتحديث المخزون. هل أنت متأكد؟`,
      confirmText: 'حفظ الفاتورة',
      variant: 'warning',
    });
    if (!ok) return;

    createMutation.mutate({
      supplier_id: parseInt(form.supplier_id, 10),
      items,
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">المشتريات</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الفاتورة أو المورد..." />
          <button
            onClick={() => {
              clearErrors();
              setForm(emptyForm());
              setModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} /> فاتورة شراء
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !(data?.data?.length) ? (
        <EmptyState message="لا توجد فواتير شراء" />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-right p-4">رقم الفاتورة</th>
                  <th className="text-right p-4">المورد</th>
                  <th className="text-right p-4">المبلغ</th>
                  <th className="text-right p-4">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.map((p) => (
                  <tr key={p.id} className="border-t dark:border-gray-700">
                    <td className="p-4">{p.invoice_number}</td>
                    <td className="p-4">{p.supplier_name}</td>
                    <td className="p-4">{formatPrice(p.total)}</td>
                    <td className="p-4">{new Date(p.purchase_date).toLocaleDateString('ar')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={data?.pagination} page={page} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={closeModal} title="فاتورة شراء جديدة" alert={formError}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <select
              className="input"
              required
              value={form.supplier_id}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
            >
              <option value="">اختر المورد</option>
              {suppliers?.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <FieldError message={getFieldError('supplier_id')} />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">بنود الفاتورة</p>
            {form.items.map((item, idx) => (
              <div key={idx} className="space-y-2 border rounded-lg p-3 dark:border-gray-700">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                  <div>
                    <select
                      className="input"
                      required
                      value={item.product_id}
                      onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                    >
                      <option value="">اختر المنتج</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name_ar}
                          {p.sku ? ` — ${p.sku}` : ''}
                        </option>
                      ))}
                    </select>
                    <FieldError message={getFieldError(`items[${idx}].product_id`) || getFieldError('items.0.product_id')} />
                  </div>
                  {form.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="btn-outline text-red-500 px-3"
                      title="حذف البند"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      placeholder="الكمية"
                      required
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    />
                    <FieldError message={getFieldError(`items[${idx}].quantity`)} />
                  </div>
                  <div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="تكلفة الوحدة"
                      required
                      value={item.unit_cost}
                      onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)}
                    />
                    <FieldError message={getFieldError(`items[${idx}].unit_cost`)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}
            className="btn-outline w-full"
          >
            + إضافة منتج
          </button>

          <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full">
            {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
