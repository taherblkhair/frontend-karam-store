import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye } from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { useListParams } from '@shared/hooks/useListParams';
import { useConfirm } from '@shared/hooks/useConfirm';
import { purchasesApi } from '@modules/purchases/api/purchases.api';
import { PurchaseLineItem } from '@modules/purchases/components/PurchaseLineItem';
import { LoadingSpinner, Modal, FieldError, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';
import { formatPrice } from '@core/constants';

const emptyItem = () => ({
  product_id: '',
  variant_id: '',
  quantity: '1',
  unit_cost: '',
  has_variants: false,
  variants: [],
  loadingVariants: false,
});

const emptyForm = () => ({
  supplier_id: '',
  notes: '',
  purchase_date: new Date().toISOString().split('T')[0],
  items: [emptyItem()],
});

/** Unique key for invoice line: variant OR simple product */
function lineKey(item) {
  if (!item?.product_id) return null;
  if (item.has_variants || item.variant_id) {
    return item.variant_id ? `v:${item.variant_id}` : null;
  }
  return `p:${item.product_id}`;
}

function findDuplicateLine(items) {
  const seen = new Set();
  for (const item of items) {
    const key = lineKey(item);
    if (!key) continue;
    if (seen.has(key)) return item;
    seen.add(key);
  }
  return null;
}

export default function PurchasesPage() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
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

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['purchase', detailId],
    queryFn: () => purchasesApi.getById(detailId),
    enabled: !!detailId,
  });

  const createMutation = useMutation({
    mutationFn: purchasesApi.create,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['purchases']);
      queryClient.invalidateQueries(['inventory']);
      closeModal();
      notifySuccess(res);
      if (res?.data?.id) setDetailId(res.data.id);
    },
    onError: (err) => {
      applyApiError(err);
      notifyError(err);
    },
  });

  const products = productsData?.data || [];
  const detail = detailData?.data;

  const invoiceTotal = useMemo(
    () =>
      form.items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const cost = parseFloat(item.unit_cost) || 0;
        return sum + qty * cost;
      }, 0),
    [form.items]
  );

  const updateItem = (idx, patch) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const removeItem = (idx) => {
    setForm((prev) => {
      if (prev.items.length === 1) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== idx) };
    });
  };

  const handleProductChange = async (idx, productId) => {
    if (productId) {
      const listProduct = products.find((p) => String(p.id) === String(productId));
      const alreadySimple = form.items.some(
        (item, i) =>
          i !== idx
          && String(item.product_id) === String(productId)
          && !item.has_variants
      );
      if (alreadySimple && listProduct && !listProduct.has_variants) {
        notifyError({ message: 'هذا الصنف مضاف مسبقاً في الفاتورة' });
        return;
      }
    }

    updateItem(idx, {
      product_id: productId,
      variant_id: '',
      has_variants: false,
      variants: [],
      unit_cost: '',
      loadingVariants: !!productId,
    });

    if (!productId) return;

    try {
      const res = await purchasesApi.getProduct(productId);
      const product = res.data;
      const variants = product.variants || [];
      const hasVariants = Boolean(product.has_variants && variants.length);

      if (!hasVariants) {
        const already = form.items.some(
          (item, i) =>
            i !== idx
            && String(item.product_id) === String(productId)
            && !item.has_variants
        );
        if (already) {
          updateItem(idx, {
            product_id: '',
            variant_id: '',
            has_variants: false,
            variants: [],
            unit_cost: '',
            loadingVariants: false,
          });
          notifyError({ message: 'هذا الصنف مضاف مسبقاً في الفاتورة' });
          return;
        }
      }

      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item, i) => {
          if (i !== idx || String(item.product_id) !== String(productId)) return item;
          return {
            ...item,
            has_variants: hasVariants,
            variants,
            unit_cost:
              product.cost_price != null && product.cost_price !== ''
                ? String(product.cost_price)
                : '',
            loadingVariants: false,
            variant_id: '',
          };
        }),
      }));
    } catch {
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item, i) =>
          i === idx && String(item.product_id) === String(productId)
            ? { ...item, loadingVariants: false }
            : item
        ),
      }));
      notifyError({ message: 'تعذر تحميل تفاصيل المنتج' });
    }
  };

  const handleFieldChange = (idx, field, value) => {
    if (field === 'variant_id' && value) {
      const taken = form.items.some(
        (item, i) => i !== idx && String(item.variant_id) === String(value)
      );
      if (taken) {
        notifyError({ message: 'هذا المتغير مضاف مسبقاً في الفاتورة' });
        return;
      }
    }
    updateItem(idx, { [field]: value });
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

    if (findDuplicateLine(form.items)) {
      notifyError({ message: 'لا يمكن تكرار نفس الصنف أو نفس المتغير في الفاتورة' });
      return;
    }

    const items = [];
    for (const item of form.items) {
      if (!item.product_id) continue;

      if (item.has_variants && !item.variant_id) {
        notifyError({ message: 'اختر المتغير لكل منتج يعتمد على متغيرات' });
        return;
      }

      const quantity = parseInt(item.quantity, 10);
      const unit_cost = item.unit_cost !== '' ? parseFloat(item.unit_cost) : null;

      if (!quantity || quantity < 1 || unit_cost == null || unit_cost < 0) {
        notifyError({ message: 'تحقق من الكمية وتكلفة الوحدة لكل بند' });
        return;
      }

      items.push({
        product_id: parseInt(item.product_id, 10),
        variant_id: item.variant_id ? parseInt(item.variant_id, 10) : null,
        quantity,
        unit_cost,
      });
    }

    if (!items.length) {
      notifyError({ message: 'أضف صنفاً واحداً على الأقل' });
      return;
    }

    // Final uniqueness check on payload keys
    const keys = new Set();
    for (const item of items) {
      const key = item.variant_id ? `v:${item.variant_id}` : `p:${item.product_id}`;
      if (keys.has(key)) {
        notifyError({ message: 'لا يمكن تكرار نفس الصنف أو نفس المتغير في الفاتورة' });
        return;
      }
      keys.add(key);
    }

    const ok = await confirm({
      title: 'تأكيد فاتورة الشراء',
      message: `سيتم تسجيل فاتورة بـ ${items.length} بند/بنود بإجمالي ${formatPrice(invoiceTotal)} وتحديث المخزون. هل أنت متأكد؟`,
      confirmText: 'حفظ الفاتورة',
      variant: 'warning',
    });
    if (!ok) return;

    createMutation.mutate({
      supplier_id: parseInt(form.supplier_id, 10),
      notes: form.notes || undefined,
      purchase_date: form.purchase_date || undefined,
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
                  <th className="text-right p-4">عرض</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.map((p) => (
                  <tr key={p.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="p-4 font-medium">{p.invoice_number}</td>
                    <td className="p-4">{p.supplier_name}</td>
                    <td className="p-4">{formatPrice(p.total)}</td>
                    <td className="p-4">{new Date(p.purchase_date).toLocaleDateString('ar')}</td>
                    <td className="p-4">
                      <button
                        type="button"
                        className="btn-outline text-sm py-1.5 px-3"
                        onClick={() => setDetailId(p.id)}
                      >
                        <Eye size={16} /> تفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={data?.pagination} page={page} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={closeModal} title="فاتورة شراء مفصّلة" size="xl" alert={formError}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                المورد
              </label>
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
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                تاريخ الشراء
              </label>
              <input
                type="date"
                className="input"
                value={form.purchase_date}
                onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                أصناف الفاتورة
              </p>
              <p className="text-xs text-gray-500">
                لكل صنف تكلفة مستقلة — والمتغير إن وُجد
              </p>
            </div>

            {form.items.map((item, idx) => (
              <PurchaseLineItem
                key={idx}
                item={item}
                index={idx}
                products={products}
                items={form.items}
                canRemove={form.items.length > 1}
                getFieldError={getFieldError}
                onChangeProduct={(productId) => handleProductChange(idx, productId)}
                onChangeField={(field, value) => handleFieldChange(idx, field, value)}
                onRemove={() => removeItem(idx)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}
            className="btn-outline w-full"
          >
            <Plus size={16} /> إضافة صنف / متغير
          </button>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              ملاحظات (اختياري)
            </label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="ملاحظات الفاتورة..."
            />
          </div>

          <div className="rounded-xl border dark:border-gray-700 p-4 bg-primary-50/50 dark:bg-primary-900/10 flex items-center justify-between gap-3">
            <span className="font-medium">إجمالي الفاتورة</span>
            <span className="text-xl font-bold text-primary-600">{formatPrice(invoiceTotal)}</span>
          </div>

          <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full py-3">
            {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ فاتورة الشراء'}
          </button>
        </form>
      </Modal>

      <Modal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        title={detail ? `فاتورة ${detail.invoice_number}` : 'تفاصيل الفاتورة'}
        size="xl"
      >
        {detailLoading || !detail ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">المورد</p>
                <p className="font-medium">{detail.supplier_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">التاريخ</p>
                <p className="font-medium">
                  {new Date(detail.purchase_date).toLocaleDateString('ar')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">المستخدم</p>
                <p className="font-medium">{detail.user_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">الحالة</p>
                <p className="font-medium">{detail.status}</p>
              </div>
            </div>

            {detail.notes ? (
              <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
                {detail.notes}
              </p>
            ) : null}

            <div className="overflow-x-auto border rounded-xl dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-right p-3">الصنف</th>
                    <th className="text-right p-3">المتغير</th>
                    <th className="text-right p-3">الكمية</th>
                    <th className="text-right p-3">تكلفة الوحدة</th>
                    <th className="text-right p-3">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.items || []).map((item) => (
                    <tr key={item.id} className="border-t dark:border-gray-700">
                      <td className="p-3">
                        <div className="font-medium">{item.product_name}</div>
                        {(item.variant_sku || item.product_sku) && (
                          <div className="text-xs text-gray-400">
                            {item.variant_sku || item.product_sku}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-300">
                        {item.variant_info || '—'}
                      </td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">{formatPrice(item.unit_cost)}</td>
                      <td className="p-3 font-medium">{formatPrice(item.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
              <span className="text-gray-500 text-sm">
                {(detail.items || []).length} بند
              </span>
              <div className="text-left">
                <p className="text-xs text-gray-500">الإجمالي</p>
                <p className="text-xl font-bold text-primary-600">{formatPrice(detail.total)}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
