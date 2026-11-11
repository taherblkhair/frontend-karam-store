import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, RefreshCw } from 'lucide-react';
import { useListParams } from '@shared/hooks/useListParams';
import { useConfirm } from '@shared/hooks/useConfirm';
import { useOrders, useOrderMutations } from '@modules/orders/hooks/useOrders';
import { LoadingSpinner, OrderStatusBadge } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';
import { formatPrice, ORDER_STATUS } from '@core/constants';
import { useAuth } from '@core/auth/AuthContext';
import { TableScroll } from '@shared/components/TableScroll';

/** Status filter options (details and actions live on /admin/orders/:id) */
const STATUS_OPTIONS = ['new', 'pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

export default function OrdersPage() {
  const confirm = useConfirm();
  const { isAdmin, hasPermission } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const { search, setSearch, page, setPage, withExtra } = useListParams();

  const listParams = withExtra({ status: statusFilter || undefined });
  const { data, isLoading } = useOrders(listParams);
  const { refreshPendingSabil: refreshPendingSabilMutation } = useOrderMutations(null);

  const orders = data?.data || [];
  const allowedStatuses = STATUS_OPTIONS;
  const canManage = isAdmin || hasPermission('orders.manage');
  const canShip = hasPermission('shipping.create') || canManage;

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">الطلبات</h1>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الطلب أو الهاتف..." />
          <select className="input w-full sm:w-auto sm:min-w-[10rem]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">جميع الحالات</option>
            {allowedStatuses.map((s) => (
              <option key={s} value={s}>{ORDER_STATUS[s]?.label || s}</option>
            ))}
          </select>
          {canShip && (
            <button
              type="button"
              className="btn-primary text-sm whitespace-nowrap"
              disabled={refreshPendingSabilMutation.isPending}
              onClick={async () => {
                const ok = await confirm({
                  title: 'تحديث حالات الشحن',
                  message:
                    'سيتم جلب حالة الشحنات غير المسلّمة وغير الملغاة من درب السبيل. إذا كانت الشحنة «تم التسليم» هناك، يُحدَّث الطلب إلى تم التسليم.',
                  confirmText: 'تحديث الحالات',
                  variant: 'default',
                });
                if (!ok) return;
                refreshPendingSabilMutation.mutate();
              }}
            >
              <RefreshCw
                size={15}
                className={refreshPendingSabilMutation.isPending ? 'animate-spin' : ''}
              />
              {refreshPendingSabilMutation.isPending
                ? 'جاري تحديث الحالات...'
                : 'تحديث حالات الشحن'}
            </button>
          )}
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <TableScroll>
            <table className="admin-table">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-right p-4">رقم الطلب</th>
                <th className="text-right p-4">العميل</th>
                <th className="text-right p-4">الهاتف</th>
                <th className="text-right p-4">المبلغ</th>
                <th className="text-right p-4">المصدر</th>
                <th className="text-right p-4">الحالة</th>
                <th className="text-right p-4">التاريخ</th>
                <th className="text-right p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-4 font-medium">
                    <Link to={`/admin/orders/${o.id}`} className="hover:text-primary-600">{o.order_number}</Link>
                  </td>
                  <td className="p-4">{o.customer_name}</td>
                  <td className="p-4">{o.customer_phone}</td>
                  <td className="p-4">{formatPrice(o.total)}</td>
                  <td className="p-4">{o.source === 'pos' ? 'POS' : 'متجر'}</td>
                  <td className="p-4"><OrderStatusBadge status={o.status} /></td>
                  <td className="p-4">{new Date(o.created_at).toLocaleDateString('ar')}</td>
                  <td className="p-4">
                    <Link to={`/admin/orders/${o.id}`} className="btn-outline text-xs py-1"><Eye size={14} /> عرض</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableScroll>
      )}

      <Pagination pagination={data?.pagination} page={page} onPageChange={setPage} />
    </div>
  );
}
