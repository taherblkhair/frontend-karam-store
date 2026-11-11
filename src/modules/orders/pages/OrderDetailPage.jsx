import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CreditCard,
  History,
  MessageCircle,
  PackageCheck,
  Printer,
  Save,
  StickyNote,
  Trash2,
  Truck,
} from 'lucide-react';
import { SabilShipmentCard } from '@modules/orders/components/SabilShipmentCard';
import { PartialDeliveryModal } from '@modules/orders/components/PartialDeliveryModal';
import { OrderItemEventsLog } from '@modules/orders/components/OrderItemEventsLog';
import { OrderStatusActions } from '@modules/orders/components/OrderStatusActions';
import { OrderStatusTimeline } from '@modules/orders/components/OrderStatusTimeline';
import { OrderInternalNotes } from '@modules/orders/components/OrderInternalNotes';
import { OrderPaymentCard } from '@modules/orders/components/OrderPaymentCard';
import {
  ItemStatusBadge,
  itemRemaining,
  itemOrderedQuantity,
} from '@modules/orders/components/OrderItemStatus';
import { useConfirm } from '@shared/hooks/useConfirm';
import { useOrder, useOrderMutations, useStoreSettings } from '@modules/orders/hooks/useOrders';
import { LoadingSpinner, OrderStatusBadge, EmptyState } from '@shared/ui';
import { formatPrice } from '@core/constants';
import {
  WHATSAPP_TEMPLATES,
  customerWhatsAppLink,
  defaultTemplateKey,
} from '@modules/orders/utils/whatsappMessage';
import { printOrderInvoice } from '@shared/services/invoice.service';
import { useAuth } from '@core/auth/AuthContext';
import { resolveMediaUrl } from '@core/api/config.js';

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ar-LY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * One-click WhatsApp to the customer with a ready message (order, items, total, tracking link).
 * The template matching the status is highlighted; staff can edit the text in WhatsApp.
 */
function CustomerWhatsAppActions({ order, storeName }) {
  const suggested = defaultTemplateKey(order.status);
  const closed = ['delivered', 'cancelled', 'returned'].includes(order.status);
  const hasPhone = Boolean(customerWhatsAppLink(order, suggested, storeName));

  if (!hasPhone) {
    return <p className="text-xs text-red-600">رقم هاتف العميل غير صالح لواتساب — صحّحه في معلومات العميل.</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-ink-500 dark:text-gray-400">مراسلة العميل عبر واتساب</p>
      <div className="flex flex-wrap gap-2">
        {WHATSAPP_TEMPLATES.map((t) => (
          <a
            key={t.key}
            href={customerWhatsAppLink(order, t.key, storeName || 'متجر كرم')}
            target="_blank"
            rel="noopener noreferrer"
            className={`${!closed && t.key === suggested ? 'btn-primary' : 'btn-outline'} text-sm`}
            title={`فتح محادثة العميل برسالة «${t.label}» جاهزة`}
          >
            <MessageCircle size={14} /> {t.label}
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * /admin/orders/:id — full order page (replaces the list pop-up).
 * Status changes follow the server rules (allowed_transitions); cancel / return ask for a reason.
 */
export default function OrderDetailPage() {
  const { id } = useParams();
  const selectedId = Number(id);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { isAdmin, hasPermission } = useAuth();
  const [editForm, setEditForm] = useState({});
  const [shippingLabel, setShippingLabel] = useState('');
  const [fulfillmentOpen, setFulfillmentOpen] = useState(false);

  const { data: orderDetail, isLoading: detailLoading } = useOrder(selectedId);
  const { data: settingsData } = useStoreSettings();

  const {
    updateStatus: statusMutation,
    updateItemsFulfillment: fulfillmentMutation,
    updateOrder: updateMutation,
    updateShippingLabel: shippingMutation,
    generateShippingLabel: generateLabelMutation,
    syncSabil: syncSabilMutation,
    refreshSabil: refreshSabilMutation,
    removeOrder: deleteMutation,
    addNote: addNoteMutation,
    deleteNote: deleteNoteMutation,
    reviewPayment: reviewPaymentMutation,
  } = useOrderMutations(selectedId, {
    onLabelSuccess: (res) => setShippingLabel(res.data.shipping_label || res.data.sabil_reference || ''),
  });

  const order = orderDetail?.data;
  const canManage = isAdmin || hasPermission('orders.manage');
  const canShip = hasPermission('shipping.create') || canManage;
  const canFulfill = canManage || hasPermission('orders.confirm');
  const fulfillment = order?.fulfillment;
  const hasItemChanges =
    !!fulfillment &&
    (fulfillment.cancelled_qty > 0 ||
      fulfillment.returned_qty > 0 ||
      (fulfillment.delivered_qty > 0 && fulfillment.remaining_qty > 0));
  const hasOpenItems = (order?.items || []).some((item) => itemRemaining(item) > 0);
  const showFulfillmentAction =
    canFulfill && order && !['cancelled', 'returned'].includes(order.status) && hasOpenItems;

  if (detailLoading) return <LoadingSpinner />;
  if (!order) {
    return (
      <div>
        <Link to="/admin/orders" className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1 mb-2">
          <ArrowRight size={14} /> الطلبات
        </Link>
        <EmptyState message="الطلب غير موجود" />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <Link to="/admin/orders" className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1 mb-2">
        <ArrowRight size={14} /> الطلبات
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tabular-nums" dir="ltr">{order.order_number}</h1>
            <OrderStatusBadge status={order.status} />
            <span className="badge bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {order.source === 'pos' ? 'POS' : 'متجر'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => printOrderInvoice(order, settingsData?.data?.store_name)} className="btn-outline text-sm">
            <Printer size={14} /> طباعة الفاتورة
          </button>
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
                  deleteMutation.mutate(order.id, { onSuccess: () => navigate('/admin/orders') });
                }
              }}
              className="btn-outline text-sm text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 size={14} /> حذف الطلب
            </button>
          )}
        </div>
      </div>

      <OrderStatusActions order={order} mutation={statusMutation} />

      <div className="grid gap-4 lg:gap-6 lg:grid-cols-3 mt-4 lg:mt-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6 min-w-0">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-bold">المنتجات والنسخ المحددة</h2>
              {showFulfillmentAction && (
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => setFulfillmentOpen(true)}
                >
                  <PackageCheck size={15} /> تسليم جزئي / إلغاء منتجات
                </button>
              )}
            </div>
              <div className="space-y-3">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className={`card p-3 sm:p-4 flex gap-3 sm:gap-4 border border-ink-100 dark:border-gray-700 ${Number(item.quantity) <= 0 ? 'opacity-60' : ''}`}
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-tertiary-100 dark:bg-gray-700 shrink-0 ring-1 ring-ink-100 dark:ring-gray-600">
                      {item.image ? (
                        <img
                          src={resolveMediaUrl(item.image)}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-ink-300">
                          بلا صورة
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-ink-800 dark:text-gray-100">{item.product_name}</span>
                        {item.item_status && <ItemStatusBadge status={item.item_status} />}
                      </div>
                      {(item.variant_info || item.color_name || item.size_name || item.variant_id) && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {item.color_name && (
                            <span className="inline-flex items-center rounded-full bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200 px-2.5 py-0.5 text-xs font-semibold">
                              اللون: {item.color_name}
                            </span>
                          )}
                          {item.size_name && (
                            <span className="inline-flex items-center rounded-full bg-secondary-50 text-ink-800 dark:bg-secondary-900/20 px-2.5 py-0.5 text-xs font-semibold">
                              المقاس: {item.size_name}
                            </span>
                          )}
                          {!item.color_name && !item.size_name && item.variant_info && (
                            <span className="inline-flex items-center rounded-full bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200 px-2.5 py-0.5 text-xs font-semibold">
                              {item.variant_info}
                            </span>
                          )}
                          {item.variant_id && (
                            <span className="inline-flex items-center rounded-full bg-ink-50 text-ink-500 dark:bg-ink-800 px-2.5 py-0.5 text-[11px]">
                              معرّف النسخة #{item.variant_id}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500 dark:text-gray-400">
                        <span>
                          SKU:{' '}
                          <strong className="text-ink-700 dark:text-gray-200 font-mono text-xs">
                            {item.sku || '—'}
                          </strong>
                        </span>
                        <span>
                          الكمية: <strong className="text-ink-800 dark:text-gray-100">{item.quantity}</strong>
                          {itemOrderedQuantity(item) !== Number(item.quantity) && (
                            <span className="text-xs"> (من أصل {itemOrderedQuantity(item)})</span>
                          )}
                        </span>
                        <span>
                          سعر الوحدة:{' '}
                          <strong className="text-ink-800 dark:text-gray-100">
                            {formatPrice(item.unit_price)}
                          </strong>
                        </span>
                      </div>
                      {(Number(item.delivered_quantity) > 0 ||
                        Number(item.cancelled_quantity) > 0 ||
                        Number(item.returned_quantity) > 0) && (
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          {Number(item.delivered_quantity) > 0 && (
                            <span className="text-emerald-700 dark:text-emerald-300">مُسلَّم: {item.delivered_quantity}</span>
                          )}
                          {itemRemaining(item) > 0 && (
                            <span className="text-amber-700 dark:text-amber-300">متبقٍ: {itemRemaining(item)}</span>
                          )}
                          {Number(item.cancelled_quantity) > 0 && (
                            <span className="text-red-600 dark:text-red-300">ملغي: {item.cancelled_quantity}</span>
                          )}
                          {Number(item.returned_quantity) > 0 && (
                            <span className="text-orange-600 dark:text-orange-300">مرتجع: {item.returned_quantity}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-left shrink-0 font-bold text-primary-600 tabular-nums">
                      {formatPrice(item.total)}
                    </div>
                  </div>
                ))}
              </div>
          </section>

          <OrderItemEventsLog events={order.item_events} />

            {canShip && !['cancelled', 'returned'].includes(order.status) && (
              <div className="card p-4 space-y-3">
                <h3 className="font-bold flex items-center gap-2"><Truck size={18} /> بوليصة الشحن / درب السبيل</h3>

                {order.source === 'online' && (
                  <SabilShipmentCard
                    order={order}
                    syncMutation={syncSabilMutation}
                    refreshMutation={refreshSabilMutation}
                  />
                )}

                <div className="flex flex-wrap gap-2">
                  <input
                    className="input flex-1 min-w-[200px]"
                    placeholder="رقم البوليصة"
                    value={shippingLabel || order.shipping_label || ''}
                    onChange={(e) => setShippingLabel(e.target.value)}
                  />
                  <button onClick={() => shippingMutation.mutate(shippingLabel || order.shipping_label)} className="btn-secondary text-sm">حفظ</button>
                  <button onClick={() => generateLabelMutation.mutate()} disabled={generateLabelMutation.isPending} className="btn-primary text-sm">
                    {order.source === 'online' ? 'إنشاء البوليصة' : 'إنشاء بوليصة'}
                  </button>
                </div>
                {order.shipping_label && <p className="text-sm text-green-600">البوليصة الحالية: {order.shipping_label}</p>}
              </div>
            )}
        </div>

        {/* Side column */}
        {/* On phones: customer, totals and notes come right after the status panel */}
        <aside className="space-y-4 lg:space-y-6 min-w-0 order-first lg:order-none">
          <section className="card p-4 space-y-3">
            <h2 className="font-bold">معلومات العميل</h2>
                {canManage ? (
                  <>
                    {(order.city_name || order.area_name) && (
                      <p className="text-sm text-ink-500">
                        {order.city_name}{order.area_name && ` - ${order.area_name}`}
                      </p>
                    )}
                    <input className="input" value={editForm.customer_name ?? order.customer_name} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })} placeholder="الاسم" />
                    <input className="input" value={editForm.customer_phone ?? order.customer_phone} onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })} placeholder="الهاتف" />
                    <textarea className="input" rows={2} value={editForm.address ?? order.address ?? ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="العنوان" />
                    <textarea className="input" rows={2} value={editForm.notes ?? order.notes ?? ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="ملاحظة العميل (تظهر في الطلب)" />
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
          </section>

          <section className="space-y-3">
            <h2 className="font-bold">ملخص الطلب</h2>
                <div className="text-sm space-y-1 card p-4">
                  <div className="flex justify-between"><span>المجموع</span><span>{formatPrice(order.subtotal)}</span></div>
                  <div className="flex justify-between"><span>الخصم</span><span>{formatPrice(order.discount)}</span></div>
                  <div className="flex justify-between"><span>الشحن</span><span>{formatPrice(order.shipping_cost)}</span></div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2"><span>الإجمالي</span><span className="text-primary-600">{formatPrice(order.total)}</span></div>
                  {hasItemChanges && (
                    <div className="border-t pt-2 mt-1 space-y-1 text-xs text-ink-500 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>قيمة المسلَّم ({fulfillment.delivered_qty})</span>
                        <span className="text-emerald-700 dark:text-emerald-300">{formatPrice(fulfillment.delivered_amount)}</span>
                      </div>
                      {fulfillment.remaining_qty > 0 && (
                        <div className="flex justify-between">
                          <span>قيمة المتبقي ({fulfillment.remaining_qty})</span>
                          <span>{formatPrice(fulfillment.remaining_amount)}</span>
                        </div>
                      )}
                      {fulfillment.cancelled_qty > 0 && (
                        <div className="flex justify-between">
                          <span>ملغي ومُعاد للمخزون ({fulfillment.cancelled_qty})</span>
                          <span className="text-red-600 line-through">{formatPrice(fulfillment.cancelled_amount)}</span>
                        </div>
                      )}
                      {fulfillment.returned_qty > 0 && (
                        <div className="flex justify-between">
                          <span>مرتجع ومُعاد للمخزون ({fulfillment.returned_qty})</span>
                          <span className="text-orange-600 line-through">{formatPrice(fulfillment.returned_amount)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
            <CustomerWhatsAppActions order={order} storeName={settingsData?.data?.store_name} />
          </section>

          <section className="card p-4">
            <h2 className="font-bold mb-3 flex items-center gap-2"><CreditCard size={18} /> الدفع</h2>
            <OrderPaymentCard order={order} reviewMutation={reviewPaymentMutation} canReview={canFulfill} />
          </section>

          <section className="card p-4">
            <h2 className="font-bold mb-3 flex items-center gap-2"><StickyNote size={18} /> ملاحظات داخلية</h2>
            <OrderInternalNotes
              notes={order.internal_notes}
              addMutation={addNoteMutation}
              deleteMutation={deleteNoteMutation}
            />
          </section>

          <section className="card p-4">
            <h2 className="font-bold mb-3 flex items-center gap-2"><History size={18} /> سجل الطلب</h2>
            <OrderStatusTimeline history={order.status_history} reasons={order.status_reasons} />
          </section>
        </aside>
      </div>

      <PartialDeliveryModal
        key={order.id}
        open={fulfillmentOpen}
        onClose={() => setFulfillmentOpen(false)}
        order={order}
        mutation={fulfillmentMutation}
      />
    </div>
  );
}
