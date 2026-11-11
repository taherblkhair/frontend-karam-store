import { ORDER_STATUS } from '@core/constants';

const SOURCE_LABELS = {
  customer: 'العميل',
  sabil: 'درب السبيل',
  system: 'النظام',
};

function formatDateTime(value) {
  return new Date(value).toLocaleString('ar-LY', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Status history, newest first: who / when / why. */
export function OrderStatusTimeline({ history = [], reasons = {} }) {
  if (!history.length) return <p className="text-sm text-gray-500">لا يوجد سجل بعد.</p>;

  const reasonLabel = (to, code) => (reasons[to] || []).find((r) => r.code === code)?.label || code;

  return (
    <ol className="relative space-y-4 border-s border-ink-100 ps-4 dark:border-gray-700">
      {history.map((h) => (
        <li key={h.id} className="relative">
          <span
            className={`absolute -start-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-gray-800 ${
              ['cancelled', 'returned'].includes(h.to_status) ? 'bg-red-500' : 'bg-primary-600'
            }`}
            aria-hidden
          />
          <p className="text-sm font-semibold">
            {h.from_status ? (
              <>
                {ORDER_STATUS[h.from_status]?.label || h.from_status}
                <span className="mx-1 text-ink-400">←</span>
              </>
            ) : (
              <span className="text-ink-500 font-medium">إنشاء الطلب · </span>
            )}
            {ORDER_STATUS[h.to_status]?.label || h.to_status}
          </p>
          {h.reason && (
            <p className="text-sm text-red-700 dark:text-red-300">السبب: {reasonLabel(h.to_status, h.reason)}</p>
          )}
          {h.note && <p className="text-sm text-ink-600 dark:text-gray-300 break-words">{h.note}</p>}
          <p className="text-xs text-gray-500 mt-0.5">
            {h.user_name || SOURCE_LABELS[h.source] || '—'} · {formatDateTime(h.created_at)}
          </p>
        </li>
      ))}
    </ol>
  );
}
