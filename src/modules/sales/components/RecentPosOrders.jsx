import { Clock, MapPin, Phone, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { salesApi } from '@modules/sales/api/sales.api';
import { LoadingSpinner } from '@shared/ui';
import { formatPrice, ORDER_STATUS } from '@core/constants';

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('ar-LY', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

export function RecentPosOrders({ open, onClose }) {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['pos-recent-orders'],
    queryFn: () => salesApi.recentOrders(10),
    enabled: open,
    refetchInterval: open ? 30000 : false,
  });

  const orders = data?.data || [];

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 left-0 z-50 w-full max-w-md bg-white dark:bg-gray-800 shadow-xl flex flex-col">
        <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Clock size={18} />
              آخر طلبات POS
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">أحدث المبيعات من نقطة البيع</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn-outline text-xs py-1.5 px-2"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              تحديث
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : !orders.length ? (
            <div className="p-10 text-center text-gray-500 text-sm">
              لا توجد طلبات POS بعد
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {orders.map((order) => {
                const status = ORDER_STATUS[order.status];
                return (
                  <li key={order.id} className="px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-semibold text-primary-600">{order.order_number}</p>
                        <p className="text-sm font-medium">{order.customer_name}</p>
                      </div>
                      <div className="text-left shrink-0">
                        <p className="font-bold">{formatPrice(order.total)}</p>
                        <p className="text-[11px] text-gray-400">{formatTime(order.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1.5">
                      {order.customer_phone && order.customer_phone !== '0000000000' && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={11} />
                          {order.customer_phone}
                        </span>
                      )}
                      {(order.city_name || order.address) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} />
                          {[order.city_name, order.address].filter(Boolean).join(' — ')}
                        </span>
                      )}
                      {status && (
                        <span className={`badge ${status.color || 'bg-gray-100 text-gray-700'}`}>
                          {status.label || order.status}
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <Link
                        to="/admin/orders"
                        className="text-xs text-primary-600 hover:underline"
                        onClick={onClose}
                      >
                        فتح في الطلبات
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
