import { useState } from 'react';
import { Eye, Trash2, Printer, Truck, MessageCircle, Save } from 'lucide-react';
import { useListParams } from '@shared/hooks/useListParams';
import { useConfirm } from '@shared/hooks/useConfirm';
import { useOrders, useOrder, useOrderMutations, useStoreSettings } from '@modules/orders/hooks/useOrders';
import { LoadingSpinner, OrderStatusBadge, Modal } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';
import { formatPrice, ORDER_STATUS, getWhatsAppLink } from '@core/constants';
import { printOrderInvoice } from '@shared/services/invoice.service';
import { useAuth } from '@core/auth/AuthContext';
import { TableScroll } from '@shared/components/TableScroll';

const STATUS_OPTIONS = {
  admin: ['new', 'pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
  // Sales: pipeline + cancel/return for undelivered / refused orders
  sales: ['new', 'pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
};

/** Primary sales actions shown as clear buttons (not just status chips) */
const SALES_ACTIONS = [
  {
    status: 'confirmed',
    label: 'تأكيد الطلب',
    when: (s) => ['new', 'pending_confirmation'].includes(s),
    className: 'btn-primary text-sm',
  },
  {
    status: 'processing',
    label: 'قيد التجهيز',
    when: (s) => ['confirmed'].includes(s),
    className: 'btn-secondary text-sm',
  },
  {
    status: 'shipped',
    label: 'تم الشحن',
    when: (s) => ['confirmed', 'processing'].includes(s),
    className: 'btn-secondary text-sm',
  },
  {
    status: 'delivered',
    label: 'تم التسليم',
    when: (s) => ['shipped'].includes(s),
    className: 'btn-primary text-sm',
  },
  {
    status: 'cancelled',
    label: 'إلغاء الطلب (قبل الاستلام)',
    when: (s) => !['cancelled', 'returned', 'delivered'].includes(s),
    className: 'btn-outline text-sm text-red-600 border-red-300',
    confirm: 'إلغاء الطلب سيعيد الكمية للمخزون. هل أنت متأكد؟',
  },
  {
    status: 'returned',
    label: 'مرتجع / لم يستلم',
    when: (s) => ['shipped', 'delivered', 'confirmed', 'processing'].includes(s),
    className: 'btn-outline text-sm text-orange-600 border-orange-300',
    confirm: 'تسجيل مرتجع سيعيد الكمية للمخزون. هل أنت متأكد؟',
  },
];

export default function OrdersPage() {
  const confirm = useConfirm();
  const { isAdmin, hasPermission } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const { search, setSearch, page, setPage, withExtra } = useListParams();
  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [shippingLabel, setShippingLabel] = useState('');

  const listParams = withExtra({ status: statusFilter || undefined });

  const { data, isLoading } = useOrders(listParams);
  const { data: orderDetail, isLoading: detailLoading } = useOrder(selectedId);

  const { data: settingsData } = useStoreSettings();

  const {
    updateStatus: statusMutation,
    updateOrder: updateMutation,
    updateShippingLabel: shippingMutation,
    generateShippingLabel: generateLabelMutation,
    removeOrder: deleteMutation,
  } = useOrderMutations(selectedId, {
    onLabelSuccess: (res) => setShippingLabel(res.data.shipping_label || ''),
  });

  const openDetail = (id) => {
    setSelectedId(id);
    setEditForm({});
    setShippingLabel('');
  };

  const order = orderDetail?.data;
  const orders = data?.data || [];
  const allowedStatuses = isAdmin ? STATUS_OPTIONS.admin : STATUS_OPTIONS.sales;
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
                  <td className="p-4 font-medium">{o.order_number}</td>
                  <td className="p-4">{o.customer_name}</td>
                  <td className="p-4">{o.customer_phone}</td>
                  <td className="p-4">{formatPrice(o.total)}</td>
                  <td className="p-4">{o.source === 'pos' ? 'POS' : 'متجر'}</td>
                  <td className="p-4"><OrderStatusBadge status={o.status} /></td>
                  <td className="p-4">{new Date(o.created_at).toLocaleDateString('ar')}</td>
                  <td className="p-4">
                    <button onClick={() => openDetail(o.id)} className="btn-outline text-xs py-1"><Eye size={14} /> عرض</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableScroll>
      )}

      <Pagination pagination={data?.pagination} page={page} onPageChange={setPage} />

      <Modal open={!!selectedId} onClose={() => setSelectedId(null)} title={order ? `طلب ${order.order_number}` : 'تفاصيل الطلب'} size="xl">
        {detailLoading ? <LoadingSpinner /> : order && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-bold">معلومات العميل</h3>
                {canManage ? (
                  <>
                    <input className="input" value={editForm.customer_name ?? order.customer_name} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })} placeholder="الاسم" />
                    <input className="input" value={editForm.customer_phone ?? order.customer_phone} onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })} placeholder="الهاتف" />
                    <textarea className="input" rows={2} value={editForm.address ?? order.address ?? ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="العنوان" />
                    <textarea className="input" rows={2} value={editForm.notes ?? order.notes ?? ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="ملاحظات" />
                    <button
                      onClick={() => updateMutation.mutate({
                        customer_name: editForm.customer_name ?? order.customer_name,
                        customer_phone: editForm.customer_phone ?? order.customer_phone,
                        address: editForm.address ?? order.address,
                        notes: editForm.notes ?? order.notes,
                      })}
                      className="btn-secondary text-sm"
                    >
                      <Save size={14} /> حفظ التعديلات
                    </button>
                  </>
                ) : (
                  <div className="text-sm space-y-1">
                    <div>{order.customer_name}</div>
                    <div>{order.customer_phone}</div>
                    <div>{order.city_name} {order.area_name && `- ${order.area_name}`}</div>
                    <div>{order.address}</div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-bold">ملخص الطلب</h3>
                <div className="text-sm space-y-1 card p-4">
                  <div className="flex justify-between"><span>المجموع</span><span>{formatPrice(order.subtotal)}</span></div>
                  <div className="flex justify-between"><span>الخصم</span><span>{formatPrice(order.discount)}</span></div>
                  <div className="flex justify-between"><span>الشحن</span><span>{formatPrice(order.shipping_cost)}</span></div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2"><span>الإجمالي</span><span className="text-primary-600">{formatPrice(order.total)}</span></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => printOrderInvoice(order, settingsData?.data?.store_name)} className="btn-outline text-sm">
                    <Printer size={14} /> طباعة الفاتورة
                  </button>
                  <a
                    href={getWhatsAppLink(settingsData?.data?.store_whatsapp || '218945270764', order.order_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline text-sm"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3">المنتجات</h3>
              <div className="overflow-x-auto -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="admin-table border dark:border-gray-700 rounded-lg">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="text-right p-3">المنتج</th>
                      <th className="text-right p-3">SKU</th>
                      <th className="text-right p-3">الكمية</th>
                      <th className="text-right p-3">السعر</th>
                      <th className="text-right p-3">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items?.map((item) => (
                      <tr key={item.id} className="border-t dark:border-gray-700">
                        <td className="p-3">{item.product_name}{item.variant_info ? ` (${item.variant_info})` : ''}</td>
                        <td className="p-3">{item.sku || '-'}</td>
                        <td className="p-3">{item.quantity}</td>
                        <td className="p-3">{formatPrice(item.unit_price)}</td>
                        <td className="p-3">{formatPrice(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {canShip && (
              <div className="card p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2"><Truck size={18} /> بوليصة الشحن</h3>
                <div className="flex flex-wrap gap-2">
                  <input
                    className="input flex-1 min-w-[200px]"
                    placeholder="رقم البوليصة"
                    value={shippingLabel || order.shipping_label || ''}
                    onChange={(e) => setShippingLabel(e.target.value)}
                  />
                  <button onClick={() => shippingMutation.mutate(shippingLabel || order.shipping_label)} className="btn-secondary text-sm">حفظ</button>
                  <button onClick={() => generateLabelMutation.mutate()} disabled={generateLabelMutation.isPending} className="btn-primary text-sm">
                    إنشاء بوليصة
                  </button>
                </div>
                {order.shipping_label && <p className="text-sm text-green-600 mt-2">البوليصة الحالية: {order.shipping_label}</p>}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="font-bold mb-2">إجراءات المبيعات</h3>
                <p className="text-xs text-gray-500 mb-3">
                  الإلغاء / المرتجع يعيد الكمية تلقائياً إلى المخزون القابل للبيع
                </p>
                <div className="flex flex-wrap gap-2">
                  {SALES_ACTIONS.filter((a) => a.when(order.status) && allowedStatuses.includes(a.status)).map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      disabled={statusMutation.isPending}
                      className={action.className}
                      onClick={async () => {
                        if (action.confirm) {
                          const ok = await confirm({
                            title: action.label,
                            message: action.confirm,
                            confirmText: 'متابعة',
                            variant: ['cancelled', 'returned'].includes(action.status) ? 'danger' : 'warning',
                          });
                          if (!ok) return;
                        }
                        statusMutation.mutate({ id: order.id, status: action.status });
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {isAdmin && (
                <div>
                  <h3 className="font-bold mb-3 text-sm text-gray-500">كل الحالات (إدارة)</h3>
                  <div className="flex flex-wrap gap-2">
                    {allowedStatuses.map((s) => (
                      <button
                        key={s}
                        onClick={async () => {
                          if (['cancelled', 'returned'].includes(s) && order.status !== s) {
                            const ok = await confirm({
                              title: ORDER_STATUS[s]?.label || s,
                              message: 'تغيير الحالة إلى إلغاء/مرتجع سيعيد الكمية للمخزون. هل أنت متأكد؟',
                              confirmText: 'تأكيد',
                              variant: 'danger',
                            });
                            if (!ok) return;
                          }
                          statusMutation.mutate({ id: order.id, status: s });
                        }}
                        disabled={order.status === s}
                        className={`btn-outline text-xs ${order.status === s ? 'border-primary-600 bg-primary-50' : ''}`}
                      >
                        {ORDER_STATUS[s]?.label || s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {canManage && ['new', 'cancelled'].includes(order.status) && (
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: 'حذف الطلب',
                    message: `هل أنت متأكد من حذف الطلب ${order.order_number}؟ لا يمكن التراجع.`,
                    confirmText: 'حذف',
                    variant: 'danger',
                  });
                  if (ok) {
                    deleteMutation.mutate(order.id, { onSuccess: () => setSelectedId(null) });
                  }
                }}
                className="btn-danger text-sm"
              >
                <Trash2 size={14} /> حذف الطلب
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
