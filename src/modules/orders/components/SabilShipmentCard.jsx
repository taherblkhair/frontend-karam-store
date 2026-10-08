import { RefreshCw, Truck } from 'lucide-react';
import { sabilEventLabel, sabilStatusLabel } from '../utils/sabilStatus';

function formatWhen(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('ar');
  } catch {
    return '';
  }
}

export function SabilShipmentCard({ order, syncMutation, refreshMutation }) {
  const hasShipment = Boolean(order.sabil_shipment_id || order.sabil_reference);
  const events = [...(order.sabil_events || [])].sort((a, b) => {
    const ta = new Date(a.timestamp || 0).getTime();
    const tb = new Date(b.timestamp || 0).getTime();
    return tb - ta;
  });
  const statusText = sabilStatusLabel(order.sabil_status, order.sabil_status_label);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm space-y-2 bg-gray-50/80 dark:bg-gray-800/50">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-gray-700 dark:text-gray-200">حالة درب السبيل</div>
        {hasShipment && (
          <button
            type="button"
            className="btn-primary text-xs py-1.5 px-2.5"
            disabled={refreshMutation.isPending}
            onClick={() => refreshMutation.mutate()}
          >
            <RefreshCw size={13} className={refreshMutation.isPending ? 'animate-spin' : ''} />
            {refreshMutation.isPending ? 'جاري التحديث...' : 'تحديث حالة الشحنة'}
          </button>
        )}
      </div>

      {hasShipment ? (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              المرجع:{' '}
              <strong className="text-primary-600">
                {order.sabil_reference || order.shipping_label || '—'}
              </strong>
            </span>
            <span>
              الحالة:{' '}
              <strong className="text-primary-700 dark:text-primary-300">{statusText}</strong>
            </span>
          </div>
          {order.sabil_last_event_type ? (
            <p className="text-xs text-gray-500">
              آخر حدث: {sabilEventLabel(order.sabil_last_event_type)}
              {order.sabil_last_event_at ? ` — ${formatWhen(order.sabil_last_event_at)}` : ''}
            </p>
          ) : null}
          {order.sabil_synced_at ? (
            <p className="text-xs text-gray-500">آخر مزامنة: {formatWhen(order.sabil_synced_at)}</p>
          ) : null}

          {events.length > 0 && (
            <ol className="mt-2 max-h-48 space-y-1.5 overflow-y-auto border-t border-gray-200 pt-2 dark:border-gray-700">
              {events.map((event) => (
                <li key={event.event_id || event.id} className="text-xs leading-relaxed">
                  <span className="font-semibold text-ink-800 dark:text-gray-100">
                    {sabilEventLabel(event.type)}
                  </span>
                  {event.timestamp ? (
                    <span className="text-gray-400"> · {formatWhen(event.timestamp)}</span>
                  ) : null}
                  {event.remarks ? (
                    <span className="block text-gray-500">{event.remarks}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <p className="text-amber-700 dark:text-amber-300">
          {order.status === 'new' || order.status === 'pending_confirmation'
            ? 'تُنشأ الشحنة تلقائياً عند تأكيد الطلب.'
            : 'لم تُنشأ شحنة في درب السبيل بعد'}
          {order.sabil_error ? ' (فشلت المحاولة السابقة)' : ''}.
        </p>
      )}

      {order.sabil_error ? (
        <p className="text-xs text-red-600 dark:text-red-400 break-words">{order.sabil_error}</p>
      ) : null}

      {!hasShipment && (
        <button
          type="button"
          className="btn-primary text-sm mt-1"
          disabled={syncMutation.isPending}
          onClick={() => syncMutation.mutate({})}
        >
          <Truck size={14} />
          {syncMutation.isPending
            ? 'جاري الإرسال...'
            : order.sabil_error
              ? 'إعادة المحاولة — درب السبيل'
              : 'إرسال إلى درب السبيل'}
        </button>
      )}
    </div>
  );
}
