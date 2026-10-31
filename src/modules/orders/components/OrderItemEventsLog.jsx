import { formatPrice } from '@core/constants';
import { ITEM_ACTION_LABELS } from './OrderItemStatus';

const ACTION_TONE = {
  deliver: 'text-emerald-700 dark:text-emerald-300',
  cancel: 'text-red-600 dark:text-red-300',
  return: 'text-orange-600 dark:text-orange-300',
};

/** Audit trail of per-item delivery / cancellation / return actions. */
export function OrderItemEventsLog({ events = [] }) {
  if (!events.length) return null;

  return (
    <div>
      <h3 className="font-bold mb-3">سجل حركات المنتجات</h3>
      <div className="card divide-y dark:divide-gray-700 border border-ink-100 dark:border-gray-700">
        {events.map((e) => (
          <div key={e.id} className="p-3 text-sm flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <span className={`font-bold ${ACTION_TONE[e.action] || ''}`}>
                {ITEM_ACTION_LABELS[e.action] || e.action} {e.quantity}
              </span>{' '}
              × {e.product_name || `#${e.order_item_id}`}
              {e.variant_info && <span className="text-xs text-ink-500"> ({e.variant_info})</span>}
              {e.stock_restored && (
                <span className="ms-2 text-xs text-emerald-700 dark:text-emerald-300">↩ أُعيدت للمخزون</span>
              )}
              {e.note && <div className="text-xs text-ink-500 dark:text-gray-400 mt-0.5">{e.note}</div>}
            </div>
            <div className="text-xs text-ink-500 dark:text-gray-400 text-left shrink-0">
              <div className="tabular-nums">{formatPrice(e.amount)}</div>
              <div>
                {new Date(e.created_at).toLocaleString('ar')}
                {e.user_name && ` · ${e.user_name}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
