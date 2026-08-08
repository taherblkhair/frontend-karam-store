import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { storeApi } from '@modules/store/api/store.api';
import StoreLayout from '@shared/layouts/StoreLayout';
import { useCart } from '@modules/store/context/CartContext';
import { useAuth } from '@core/auth/AuthContext';
import { FieldError, FormAlert } from '@shared/ui';
import { formatPrice, getWhatsAppLink } from '@core/constants';
import {
  isValidLibyaMobile,
  normalizeLibyaPhone,
  LIBYA_PHONE_MESSAGE,
} from '@shared/utils/phone';
import { clearBuyNowItems, getBuyNowItems } from '@modules/store/utils/buyNow';
import { toOrderItemPayload } from '@modules/store/utils/lineItem.js';
import { OptimizedThumb } from '@shared/components/OptimizedImage';

export default function CheckoutPage() {
  const { items: cartItems, clearCart } = useCart();
  const { user, register, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBuyNow = searchParams.get('mode') === 'buy-now';

  const [buyNowItems, setBuyNowItemsState] = useState(() => getBuyNowItems());

  // Re-read session items when landing in buy-now mode
  useEffect(() => {
    if (isBuyNow) setBuyNowItemsState(getBuyNowItems());
  }, [isBuyNow]);

  const items = isBuyNow ? buyNowItems : cartItems;
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );
  const [createAccount, setCreateAccount] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    city_id: '',
    area_id: '',
    address: '',
    notes: '',
    password: '',
  });
  const [shippingCost, setShippingCost] = useState(0);
  const [addressPrefillDone, setAddressPrefillDone] = useState(false);

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => storeApi.cities(),
  });

  const { data: areasData } = useQuery({
    queryKey: ['areas', form.city_id],
    queryFn: () => storeApi.areas(form.city_id),
    enabled: !!form.city_id,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => storeApi.settings(),
  });

  // Auto-fill from saved shipping address for logged-in customers
  useEffect(() => {
    let cancelled = false;

    async function prefill() {
      if (!user || user.role !== 'customer' || addressPrefillDone) return;

      let profile = user;
      try {
        const fresh = await refreshProfile();
        if (fresh) profile = fresh;
      } catch {
        // use local user
      }
      if (cancelled) return;

      const ship = profile.shipping_address || {};
      setForm((prev) => ({
        ...prev,
        customer_name: ship.name || profile.name || prev.customer_name,
        customer_phone: ship.phone || profile.phone || prev.customer_phone,
        city_id: ship.city_id ? String(ship.city_id) : prev.city_id,
        area_id: ship.area_id ? String(ship.area_id) : prev.area_id,
        address: ship.address || prev.address,
      }));
      setAddressPrefillDone(true);
    }

    prefill();
    return () => {
      cancelled = true;
    };
  }, [user, refreshProfile, addressPrefillDone]);

  useEffect(() => {
    if (form.city_id) {
      storeApi
        .shippingCost({ city_id: form.city_id, area_id: form.area_id || undefined })
        .then((res) => setShippingCost(res.data.shipping_cost))
        .catch(() => setShippingCost(15));
    }
  }, [form.city_id, form.area_id]);

  const orderMutation = useMutation({
    mutationFn: storeApi.createOrder,
    onSuccess: (res) => {
      if (isBuyNow) {
        clearBuyNowItems();
        setBuyNowItemsState([]);
      } else {
        clearCart();
      }
      setOrderSuccess({ ...res.data, message: res.message });
      notifySuccess(res);
      if (user?.role === 'customer') {
        refreshProfile().catch(() => {});
      }
    },
    onError: (err) => {
      applyApiError(err);
      notifyError(err);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    if (items.length === 0) {
      return notifyError({
        message: isBuyNow ? 'لا يوجد منتج للطلب. عد إلى صفحة المنتج.' : 'السلة فارغة',
      });
    }

    const customerPhone = normalizeLibyaPhone(form.customer_phone);
    if (!isValidLibyaMobile(customerPhone)) {
      return notifyError({ message: LIBYA_PHONE_MESSAGE });
    }

    if (createAccount && !user) {
      try {
        const res = await register({
          phone: customerPhone,
          password: form.password,
          name: form.customer_name || undefined,
        });
        notifySuccess(res);
      } catch (err) {
        applyApiError(err);
        return notifyError(err);
      }
    }

    const areas = areasData?.data || [];
    if (areas.length > 0 && !form.area_id) {
      return notifyError({ message: 'اختر المنطقة' });
    }

    orderMutation.mutate({
      customer_name: form.customer_name,
      customer_phone: customerPhone,
      city_id: parseInt(form.city_id, 10),
      area_id: form.area_id ? parseInt(form.area_id, 10) : null,
      address: form.address,
      notes: form.notes,
      items: items.map((i) => toOrderItemPayload(i)),
    });
  };

  if (items.length === 0 && !orderSuccess) {
    navigate(isBuyNow ? '/' : '/cart');
    return null;
  }

  if (orderSuccess) {
    const whatsapp = settingsData?.data?.store_whatsapp || '218910000000';
    return (
      <StoreLayout>
        <div className="container mx-auto px-4 py-16 text-center max-w-lg">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{orderSuccess.message}</h1>
          <p className="text-gray-500 mb-4">رقم الطلب:</p>
          <p className="text-3xl font-bold text-primary-600 mb-6">{orderSuccess.order_number}</p>
          <p className="text-gray-600 mb-8">سيتم التواصل معك لتأكيد الطلب. الدفع عند الاستلام.</p>
          <div className="flex flex-col gap-3">
            <a
              href={getWhatsAppLink(whatsapp, orderSuccess.order_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              التواصل مع المتجر عبر WhatsApp
            </a>
            <button type="button" onClick={() => navigate('/')} className="btn-outline">
              العودة للرئيسية
            </button>
          </div>
        </div>
      </StoreLayout>
    );
  }

  const total = subtotal + shippingCost;
  const hasSavedAddress = Boolean(user?.shipping_address?.address || user?.shipping_address?.city_id);

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">
          {isBuyNow ? 'اطلب الآن' : 'إتمام الطلب'}
        </h1>
        {isBuyNow && (
          <p className="text-sm text-ink-500 mb-4 -mt-3">
            طلب مباشر للمنتج المختار — سلتك الحالية لم تُمس.
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
          {formError ? (
            <div className="md:col-span-2">
              <FormAlert message={formError} />
            </div>
          ) : null}
          <div className="space-y-4">
            <div className="card p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="font-bold">معلومات التوصيل</h2>
                {hasSavedAddress && (
                  <span className="text-xs text-green-700 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                    من عنوانك المحفوظ
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <input
                    className="input"
                    placeholder="الاسم الكامل"
                    required
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  />
                  <FieldError message={getFieldError('customer_name')} />
                </div>
                <div>
                  <input
                    className="input"
                    placeholder="مثال: 0912345678"
                    pattern="09[1-5][0-9]{7}"
                    title={LIBYA_PHONE_MESSAGE}
                    required
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">091 · 092 · 093 · 094 · 095</p>
                  <FieldError message={getFieldError('customer_phone')} />
                </div>
                <select
                  className="input"
                  required
                  value={form.city_id}
                  onChange={(e) => setForm({ ...form, city_id: e.target.value, area_id: '' })}
                >
                  <option value="">اختر المدينة</option>
                  {citiesData?.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar}
                      {c.shipping_price != null ? ` — شحن ${c.shipping_price} د.ل` : ''}
                    </option>
                  ))}
                </select>
                {(areasData?.data?.length > 0 || !form.city_id) && (
                  <select
                    className="input"
                    required={!!areasData?.data?.length}
                    value={form.area_id}
                    onChange={(e) => setForm({ ...form, area_id: e.target.value })}
                    disabled={!form.city_id}
                  >
                    <option value="">اختر المنطقة</option>
                    {areasData?.data?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name_ar}
                      </option>
                    ))}
                  </select>
                )}
                <textarea
                  className="input"
                  placeholder="العنوان التفصيلي"
                  required
                  rows={3}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
                <textarea
                  className="input"
                  placeholder="ملاحظات (اختياري)"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            {!user && (
              <div className="card p-6">
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                  />
                  <span>إنشاء حساب برقم الهاتف وكلمة المرور</span>
                </label>
                {createAccount && (
                  <div>
                    <input
                      type="password"
                      className="input"
                      placeholder="كلمة المرور (8 أحرف على الأقل)"
                      required={createAccount}
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <FieldError message={getFieldError('password')} />
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-2">أو أكمل الطلب كضيف بدون تسجيل</p>
              </div>
            )}
          </div>

          <div>
            <div className="card p-6 sticky top-24">
              <h2 className="font-bold mb-4">ملخص الطلب</h2>
              <div className="space-y-3 mb-4 max-h-72 overflow-auto">
                {items.map((item) => (
                  <div key={item.key} className="flex gap-3 text-sm border-b border-ink-100 pb-3 last:border-0 dark:border-gray-700">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-tertiary-100 shrink-0 dark:bg-gray-700">
                      {item.image ? (
                        <OptimizedThumb src={item.image} alt={item.name} className="w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-ink-300">—</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink-800 dark:text-gray-100 line-clamp-2">{item.name}</p>
                      {(item.variant_info || item.color_name || item.size_name) && (
                        <p className="mt-0.5 text-xs font-medium text-primary-600">
                          {item.variant_info
                            || [item.color_name && `اللون: ${item.color_name}`, item.size_name && `المقاس: ${item.size_name}`]
                              .filter(Boolean)
                              .join(' · ')}
                        </p>
                      )}
                      {item.sku && (
                        <p className="text-[11px] text-ink-400 mt-0.5">SKU: {item.sku}</p>
                      )}
                      <p className="text-ink-500 mt-1">
                        {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <span className="font-semibold shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>المجموع</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>الشحن</span>
                  <span>{formatPrice(shippingCost)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>الإجمالي</span>
                  <span className="text-primary-600">{formatPrice(total)}</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                💵 الدفع عند الاستلام (COD)
              </div>
              <button type="submit" disabled={orderMutation.isPending} className="btn-primary w-full mt-6">
                {orderMutation.isPending ? 'جاري الإرسال...' : 'تأكيد الطلب'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </StoreLayout>
  );
}
