import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, Trash2, Printer, Truck, MessageCircle, Save } from 'lucide-react';
import { notifySuccess, notifyError } from '../../utils/notify';
import api from '../../api/axios';
import { LoadingSpinner, OrderStatusBadge, Modal } from '../../components/ui';
import { formatPrice, ORDER_STATUS, getWhatsAppLink } from '../../utils/constants';
import { printOrderInvoice } from '../../utils/invoice';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_OPTIONS = {
  admin: ['new', 'pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
  sales: ['confirmed', 'processing', 'shipped'],
};

export default function OrdersPage() {
  const { isAdmin, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [shippingLabel, setShippingLabel] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', statusFilter, search],
    queryFn: () => api.get('/orders', { params: { status: statusFilter || undefined, search: search || undefined } }),
  });

  const { data: orderDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['order', selectedId],
    queryFn: () => api.get(`/orders/${selectedId}`),
    enabled: !!selectedId,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['store-settings-mini'],
    queryFn: () => api.get('/store/settings'),
  });

  const order = orderDetail?.data;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['order', selectedId]);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`/orders/${selectedId}`, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['order', selectedId]);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const shippingMutation = useMutation({
    mutationFn: (label) => api.patch(`/orders/${selectedId}/shipping-label`, { shipping_label: label }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['order', selectedId]);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const generateLabelMutation = useMutation({
    mutationFn: () => api.post(`/orders/${selectedId}/shipping-label/generate`),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['order', selectedId]);
      setShippingLabel(res.data.shipping_label || '');
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/orders/${id}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['orders']);
      setSelectedId(null);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const openDetail = (id) => {
    setSelectedId(id);
    setEditForm({});
    setShippingLabel('');
  };

  const orders = data?.data || [];
  const allowedStatuses = isAdmin ? STATUS_OPTIONS.admin : STATUS_OPTIONS.sales;
  const canManage = isAdmin || hasPermission('orders.manage');
  const canShip = hasPermission('shipping.create') || canManage;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">الطلبات</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input className="input pr-9" placeholder="بحث برقم الطلب أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">جميع الحالات</option>
            {allowedStatuses.map((s) => (
              <option key={s} value={s}>{ORDER_STATUS[s]?.label || s}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
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
        </div>
      )}

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
              <table className="w-full text-sm border dark:border-gray-700 rounded-lg overflow-hidden">
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

            <div>
              <h3 className="font-bold mb-3">تغيير الحالة</h3>
              <div className="flex flex-wrap gap-2">
                {allowedStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => statusMutation.mutate({ id: order.id, status: s })}
                    disabled={order.status === s}
                    className={`btn-outline text-xs ${order.status === s ? 'border-primary-600 bg-primary-50' : ''}`}
                  >
                    {ORDER_STATUS[s]?.label || s}
                  </button>
                ))}
              </div>
            </div>

            {canManage && ['new', 'cancelled'].includes(order.status) && (
              <button
                onClick={() => window.confirm('حذف الطلب؟') && deleteMutation.mutate(order.id)}
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
