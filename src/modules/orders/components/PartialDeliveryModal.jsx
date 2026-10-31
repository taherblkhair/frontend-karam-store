import { useMemo, useState } from 'react';
import { PackageCheck, PackageX, Undo2 } from 'lucide-react';
import { Modal } from '@shared/ui';
import { formatPrice } from '@core/constants';
import { itemRemaining } from './OrderItemStatus';

const FIELDS = [
  { key: 'deliver', label: 'تم تسليمه', icon: PackageCheck, tone: 'text-emerald-700' },
  { key: 'cancel', label: 'إلغاء', icon: PackageX, tone: 'text-red-600' },
  { key: 'return', label: 'مرتجع', icon: Undo2, tone: 'text-orange-600' },
];

const toInt = (v) => Math.max(0, parseInt(v, 10) || 0);

/**
 * Per-line partial delivery: delivered units, and cancelled / returned undelivered units
 * (cancelled / returned go back to stock on the server).
 */
export function PartialDeliveryModal({ open, onClose, order, mutation }) {
  const [rows, setRows] = useState({});
  const [note, setNote] = useState('');

  const openItems = useMemo(
    () => (order?.items || []).filter((item) => itemRemaining(item) > 0),
    [order]
  );

  const setField = (item, key, value) => {
    const remaining = itemRemaining(item);
    setRows((prev) => {
      const row = { deliver: 0, cancel: 0, return: 0, ...prev[item.id] };
      const others = FIELDS.filter((f) => f.key !== key).reduce((s, f) => s + toInt(row[f.key]), 0);
      row[key] = Math.min(toInt(value), Math.max(0, remaining - others));
      return { ...prev, [item.id]: row };
    });
  };

  const fillAll = (item, key) => {
    setRows((prev) => ({
      ...prev,
      [item.id]: { deliver: 0, cancel: 0, return: 0, [key]: itemRemaining(item) },
    }));
  };

  const fillEveryLine = (key) => {
    setRows(
      Object.fromEntries(
        openItems.map((item) => [item.id, { deliver: 0, cancel: 0, return: 0, [key]: itemRemaining(item) }])
      )
    );
  };

  const preview = useMemo(() => {
    let subtotal = 0;
    let activeQty = 0;
    for (const item of order?.items || []) {
      const qty = Number(item.quantity) || 0;
      const row = rows[item.id] || {};
      const removed = toInt(row.cancel) + toInt(row.return);
      const perUnit = qty > 0 ? (Number(item.total) || 0) / qty : 0;
      subtotal += (Number(item.total) || 0) - perUnit * removed;
      activeQty += qty - removed;
    }
    const discount = Math.min(Number(order?.discount) || 0, subtotal);
    const total = subtotal - discount + (Number(order?.shipping_cost) || 0);
    return { subtotal, discount, total, activeQty };
  }, [order, rows]);

  const payloadItems = Object.entries(rows)
    .map(([id, r]) => ({
      id: Number(id),
      deliver: toInt(r.deliver),
      cancel: toInt(r.cancel),
      return: toInt(r.return),
    }))
    .filter((r) => r.deliver + r.cancel + r.return > 0);

  const close = () => {
    setRows({});
    setNote('');
    onClose();
  };

  const submit = () => {
    mutation.mutate(
      { items: payloadItems, note: note.trim() || undefined },
      { onSuccess: close }
    );
  };

  const willCancelEverything = preview.activeQty <= 0;
  const totalChanged = Math.abs(preview.total - (Number(order?.total) || 0)) > 0.004;

  return (
    <Modal open={open} onClose={close} title="تسليم جزئي / إلغاء منتجات" size="lg">
      {openItems.length === 0 ? (
        <p className="text-sm text-ink-500">لا توجد منتجات متبقية بانتظار التسليم في هذا الطلب.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-ink-500 dark:text-gray-400">
            حدّد لكل منتج الكمية التي سُلّمت للعميل، والكمية الملغاة أو المرتجعة. الكميات الملغاة والمرتجعة
            تُعاد تلقائياً إلى المخزون، ويبقى الطلب قائماً بباقي المنتجات.
          </p>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline text-xs" onClick={() => fillEveryLine('deliver')}>
              <PackageCheck size={14} /> تسليم كل المتبقي
            </button>
            <button type="button" className="btn-outline text-xs" onClick={() => setRows({})}>
              تصفير
            </button>
          </div>

          <div className="space-y-3">
            {openItems.map((item) => {
              const remaining = itemRemaining(item);
              const row = rows[item.id] || {};
              const used = FIELDS.reduce((s, f) => s + toInt(row[f.key]), 0);
              return (
                <div key={item.id} className="card p-3 border border-ink-100 dark:border-gray-700 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-ink-800 dark:text-gray-100">{item.product_name}</div>
                      {item.variant_info && (
                        <div className="text-xs text-primary-700 dark:text-primary-300 mt-0.5">{item.variant_info}</div>
                      )}
                    </div>
                    <div className="text-xs text-ink-500 dark:text-gray-400 text-left tabular-nums">
                      متبقٍ للتسليم: <strong className="text-ink-800 dark:text-gray-100">{remaining}</strong>
                      {used > 0 && <span> · بعد الحفظ: {remaining - used}</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {FIELDS.map(({ key, label, icon: Icon, tone }) => (
                      <label key={key} className="block">
                        <span className={`flex items-center gap-1 text-xs font-semibold mb-1 ${tone}`}>
                          <Icon size={13} /> {label}
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={remaining}
                          className="input text-center tabular-nums"
                          value={row[key] ?? 0}
                          onChange={(e) => setField(item, key, e.target.value)}
                        />
                        <button
                          type="button"
                          className="mt-1 text-[11px] text-ink-400 hover:text-primary-600 underline-offset-2 hover:underline"
                          onClick={() => fillAll(item, key)}
                        >
                          الكل ({remaining})
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <textarea
            className="input"
            rows={2}
            maxLength={500}
            placeholder="ملاحظة (اختياري) — مثال: العميل رفض المقاس"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="card p-3 text-sm space-y-1 bg-gray-50 dark:bg-gray-900/40">
            <div className="flex justify-between"><span>المجموع بعد التعديل</span><span>{formatPrice(preview.subtotal)}</span></div>
            <div className="flex justify-between"><span>الخصم</span><span>{formatPrice(preview.discount)}</span></div>
            <div className="flex justify-between"><span>الشحن</span><span>{formatPrice(order?.shipping_cost)}</span></div>
            <div className="flex justify-between font-bold border-t pt-1 dark:border-gray-700">
              <span>الإجمالي المستحق</span>
              <span className="text-primary-600">
                {formatPrice(preview.total)}
                {totalChanged && (
                  <span className="text-xs text-ink-400 font-normal ms-2 line-through">{formatPrice(order?.total)}</span>
                )}
              </span>
            </div>
          </div>

          {willCancelEverything && (
            <p className="text-sm text-red-600">
              لا يمكن إلغاء كل منتجات الطلب من هنا — استخدم «إلغاء الطلب» أو «مرتجع» للطلب بالكامل.
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-outline text-sm" onClick={close}>
              إغلاق
            </button>
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={!payloadItems.length || willCancelEverything || mutation.isPending}
              onClick={submit}
            >
              {mutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
