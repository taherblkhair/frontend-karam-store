import { useState } from 'react';
import { Check } from 'lucide-react';
import { Modal, FieldError } from '@shared/ui';
import { ORDER_STATUS } from '@core/constants';
import { useConfirm } from '@shared/hooks/useConfirm';

/** Main path shown as a progress strip */
const PATH = ['new', 'confirmed', 'processing', 'shipped', 'delivered'];
const FORWARD = ['confirmed', 'processing', 'shipped', 'delivered'];

/** Button wording for a move (from → to) */
function actionLabel(from, to) {
  if (from === 'cancelled' && to === 'new') return 'إعادة فتح الطلب';
  switch (to) {
    case 'pending_confirmation':
      return from === 'new' ? 'بانتظار رد العميل' : 'إرجاع إلى «قيد التأكيد»';
    case 'new':
      return 'إرجاع إلى «جديد»';
    case 'confirmed':
      return ['new', 'pending_confirmation'].includes(from) ? 'تأكيد الطلب' : 'إرجاع إلى «تم التأكيد»';
    case 'processing':
      return 'قيد التجهيز';
    case 'shipped':
      return 'تم الشحن';
    case 'delivered':
      return 'تم التسليم';
    case 'cancelled':
      return 'إلغاء الطلب';
    case 'returned':
      return 'تسجيل مرتجع';
    default:
      return ORDER_STATUS[to]?.label || to;
  }
}

function ProgressStrip({ status }) {
  const index = PATH.indexOf(status === 'pending_confirmation' ? 'new' : status);
  const stopped = status === 'cancelled' || status === 'returned';
  return (
    <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1" aria-label="مسار الطلب">
      {PATH.map((s, i) => {
        const reached = !stopped && index >= i;
        return (
          <li key={s} className="flex items-center gap-1 sm:gap-2 shrink-0">
            {i > 0 && <span className={`h-0.5 w-4 sm:w-8 rounded ${reached ? 'bg-primary-600' : 'bg-ink-100 dark:bg-gray-700'}`} />}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                reached
                  ? 'bg-primary-600 text-white'
                  : 'bg-tertiary-100 text-ink-400 dark:bg-gray-700 dark:text-gray-400'
              } ${index === i && !stopped ? 'ring-2 ring-primary-600/25' : ''}`}
            >
              {reached && index > i ? <Check size={12} /> : null}
              {ORDER_STATUS[s]?.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Status actions from the server's allowed_transitions — no client-side rules.
 * Cancel / return open a reason dialog; re-opening asks for confirmation (stock is taken again).
 */
export function OrderStatusActions({ order, mutation }) {
  const confirm = useConfirm();
  const [reasonFor, setReasonFor] = useState(null); // 'cancelled' | 'returned'
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});

  const allowed = order.allowed_transitions || [];
  const primary = FORWARD.find((s) => allowed.includes(s));
  const others = allowed.filter((s) => s !== primary && !['cancelled', 'returned'].includes(s));
  const danger = allowed.filter((s) => ['cancelled', 'returned'].includes(s));
  const stopped = ['cancelled', 'returned'].includes(order.status);

  const run = async (to) => {
    if (to === 'cancelled' || to === 'returned') {
      setReasonFor(to);
      setReason('');
      setNote('');
      setErrors({});
      return;
    }
    if (order.status === 'cancelled' && to === 'new') {
      const ok = await confirm({
        title: 'إعادة فتح الطلب',
        message: 'سيعود الطلب إلى «جديد» وتُخصم كمياته من المخزون مرة أخرى. إذا لم تكن الكمية متوفرة سيُرفض الإجراء.',
        confirmText: 'إعادة فتح',
        variant: 'warning',
      });
      if (!ok) return;
    }
    mutation.mutate({ id: order.id, status: to });
  };

  const submitReason = (e) => {
    e.preventDefault();
    const next = {};
    if (!reason) next.reason = 'يرجى اختيار سبب';
    if (reason === 'other' && !note.trim()) next.note = 'يرجى كتابة السبب';
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate(
      { id: order.id, status: reasonFor, reason, note: note.trim() || undefined },
      { onSuccess: () => setReasonFor(null) }
    );
  };

  const reasons = (reasonFor && order.status_reasons?.[reasonFor]) || [];

  return (
    <section className="card p-4 space-y-4">
      <ProgressStrip status={order.status} />

      {stopped && (
        <p className="text-sm text-red-700 dark:text-red-300">
          {order.status === 'cancelled' ? 'الطلب ملغي.' : 'الطلب مرتجع.'} الكميات أُعيدت للمخزون.
        </p>
      )}

      {allowed.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {primary && (
            <button type="button" disabled={mutation.isPending} onClick={() => run(primary)} className="btn-primary text-sm">
              {actionLabel(order.status, primary)}
            </button>
          )}
          {others.map((s) => (
            <button key={s} type="button" disabled={mutation.isPending} onClick={() => run(s)} className="btn-outline text-sm">
              {actionLabel(order.status, s)}
            </button>
          ))}
          {danger.map((s) => (
            <button
              key={s}
              type="button"
              disabled={mutation.isPending}
              onClick={() => run(s)}
              className={`btn-outline text-sm ${s === 'cancelled' ? 'text-red-600 border-red-300' : 'text-orange-600 border-orange-300'}`}
            >
              {actionLabel(order.status, s)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          {order.status === 'cancelled' ? 'إعادة فتح الطلب الملغي متاحة للمدير فقط.' : 'لا توجد إجراءات متاحة لهذه الحالة.'}
        </p>
      )}

      <Modal
        open={Boolean(reasonFor)}
        onClose={() => setReasonFor(null)}
        title={reasonFor === 'returned' ? 'تسجيل مرتجع' : 'إلغاء الطلب'}
      >
        <form onSubmit={submitReason} className="space-y-4">
          <p className="text-sm text-gray-500">الكميات ستُعاد إلى المخزون تلقائياً، ويُسجَّل السبب في سجل الطلب.</p>
          <fieldset>
            <legend className="block text-sm font-medium mb-2">السبب *</legend>
            <div className="grid gap-2">
              {reasons.map((r) => (
                <label
                  key={r.code}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 cursor-pointer text-sm ${
                    reason === r.code ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-ink-100 dark:border-gray-700'
                  }`}
                >
                  <input type="radio" name="status-reason" value={r.code} checked={reason === r.code} onChange={() => setReason(r.code)} />
                  {r.label}
                </label>
              ))}
            </div>
            <FieldError message={errors.reason} />
          </fieldset>
          <div>
            <label htmlFor="status-note" className="block text-sm font-medium mb-1.5">
              تفاصيل {reason === 'other' ? '*' : '(اختياري)'}
            </label>
            <textarea id="status-note" className="input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            <FieldError message={errors.note} />
          </div>
          <button type="submit" disabled={mutation.isPending} className={`w-full ${reasonFor === 'returned' ? 'btn-primary' : 'btn-danger'}`}>
            {mutation.isPending ? 'جاري الحفظ...' : reasonFor === 'returned' ? 'تسجيل المرتجع' : 'إلغاء الطلب'}
          </button>
        </form>
      </Modal>
    </section>
  );
}
