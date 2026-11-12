import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Package } from 'lucide-react';
import { storeApi } from '@modules/store/api/store.api';
import { OrderStatusBadge } from '@shared/ui';
import { formatPrice } from '@core/constants';
import { trackOrderPath } from '@modules/store/utils/trackOrder';

/** "طلباتي": orders placed with this account or as a guest with its phone; each opens its tracking page. */
export function MyOrders() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => storeApi.myOrders(),
    staleTime: 30_000,
  });
  const orders = data?.data?.orders || [];

  return (
    <section aria-labelledby="my-orders-title" className="card p-5 mb-4">
      <h2 id="my-orders-title" className="flex items-center gap-2 font-bold mb-3">
        <Package size={18} className="text-primary-600" aria-hidden /> طلباتي
      </h2>
      {isLoading ? (
        <ul className="space-y-2" aria-hidden>
          {[0, 1].map((i) => <li key={i} className="h-16 rounded-xl bg-tertiary-100 animate-pulse dark:bg-gray-700" />)}
        </ul>
      ) : isError ? (
        <p className="text-sm text-ink-500">
          تعذر تحميل الطلبات.{' '}
          <button type="button" onClick={() => refetch()} className="font-medium text-primary-600 underline underline-offset-4">إعادة المحاولة</button>
        </p>
      ) : !orders.length ? (
        <p className="text-sm text-ink-500">
          لا توجد طلبات بعد. <Link to="/products" className="font-medium text-primary-600 underline underline-offset-4">ابدأ التسوق</Link>
        </p>
      ) : (
        <ul className="divide-y divide-ink-100 dark:divide-gray-700 -mx-1">
          {orders.map((o) => (
            <li key={o.order_number}>
              <Link to={trackOrderPath(o)} className="flex items-center gap-3 rounded-xl px-1 py-3 hover:bg-tertiary-100 dark:hover:bg-gray-700/40">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold tabular-nums" dir="ltr">{o.order_number}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {new Date(o.created_at).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' · '}{o.items_count} قطعة · {formatPrice(o.total)}
                  </p>
                </div>
                <OrderStatusBadge status={o.status} />
                <ChevronLeft size={18} className="text-ink-400 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default MyOrders;
