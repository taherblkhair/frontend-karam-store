import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCircle2, Copy, X } from 'lucide-react';
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  dismissNotification,
} from '@shared/services/toast.service';
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
  sanitizePhoneInput,
  LIBYA_PHONE_MESSAGE,
} from '@shared/utils/phone';
import { clearBuyNowItems, getBuyNowItems } from '@modules/store/utils/buyNow';
import { toOrderItemPayload } from '@modules/store/utils/lineItem.js';
import { OptimizedThumb } from '@shared/components/OptimizedImage';
import { SearchableSelect } from '@modules/store/components/SearchableSelect';
import QuickFillPanel from '@modules/store/components/QuickFillPanel';
import { resolveQuickFill } from '@modules/store/utils/quickFill';

const PHONE_LENGTH = 10;
const VALIDATION_TOAST_ID = 'checkout-validation';

function phoneError(value) {
  const phone = normalizeLibyaPhone(value);
  if (!phone) return 'يرجى إدخال رقم الهاتف';
  if (!phone.startsWith('09')) return 'رقم الهاتف يجب أن يبدأ بـ 09، مثال: 0915153324';
  if (phone.length !== PHONE_LENGTH) {
    return `رقم الهاتف يجب أن يتكون من ${PHONE_LENGTH} أرقام (أدخلت ${phone.length})، مثال: 0915153324`;
  }
  if (!isValidLibyaMobile(phone)) return LIBYA_PHONE_MESSAGE;
  return '';
}

/** Ordered as on screen so the first message always points at the first field to fix. */
const DELIVERY_RULES = [
  ['customer_name', (f) => (f.customer_name.trim() ? '' : 'يرجى إدخال الاسم')],
  ['customer_phone', (f) => phoneError(f.customer_phone)],
  ['city_id', (f) => (f.city_id ? '' : 'يرجى اختيار المدينة')],
  [
    'area_id',
    (f, ctx) => {
      if (ctx.areasLoading) return 'جاري تحميل المناطق، يرجى الانتظار ثم اختيار المنطقة';
      return ctx.areasRequired && !f.area_id ? 'يرجى اختيار المنطقة' : '';
    },
  ],
  [
    'password',
    (f, ctx) =>
      ctx.passwordRequired && f.password.length < 8
        ? 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل'
        : '',
  ],
];

function firstDeliveryError(form, ctx) {
  for (const [field, rule] of DELIVERY_RULES) {
    const message = rule(form, ctx);
    if (message) return { field, message };
  }
  return null;
}

function RequiredMark() {
  return (
    <span className="text-red-500" aria-hidden>
      {' '}*
    </span>
  );
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'absolute';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
}

function itemVariantLabel(item) {
  return (
    item.variant_info ||
    [item.color_name && `اللون: ${item.color_name}`, item.size_name && `المقاس: ${item.size_name}`]
      .filter(Boolean)
      .join(' · ')
  );
}

function formatOrderSummaryText(order) {
  const items = order.items || [];
  const location = [order.city_name, order.area_name].filter(Boolean).join(' — ');
  const lines = [
    `رقم الطلب: ${order.order_number || ''}`,
    `الاسم: ${order.customer_name || ''}`,
    `الهاتف: ${order.customer_phone || ''}`,
    location ? `المدينة / المنطقة: ${location}` : null,
    order.address ? `العنوان: ${order.address}` : null,
    '',
    'المنتجات:',
    ...items.map((item, index) => {
      const variant = itemVariantLabel(item);
      const name = item.product_name || item.name || `منتج ${index + 1}`;
      return `• ${name}${variant ? ` (${variant})` : ''} — ${item.quantity} × ${formatPrice(item.unit_price ?? item.price)} = ${formatPrice(item.total ?? item.quantity * (item.unit_price ?? item.price))}`;
    }),
    '',
    `المجموع: ${formatPrice(order.subtotal)}`,
    `الشحن: ${formatPrice(order.shipping_cost)}`,
    `الإجمالي: ${formatPrice(order.total)}`,
  ].filter((line) => line !== null);

  return lines.join('\n');
}

export default function CheckoutPage() {
  const { items: cartItems, clearCart } = useCart();
  const { user, register, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBuyNow = searchParams.get('mode') === 'buy-now';

  const [buyNowItems, setBuyNowItemsState] = useState(() => getBuyNowItems());

  // Re-read session items when landing in buy-now mode
  useEffect(() => {
    if (isBuyNow) setBuyNowItemsState(getBuyNowItems());
  }, [isBuyNow]);

  // Always open at the top (delivery form), not mid-page order summary
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
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
  const [clientError, setClientError] = useState(null);
  const fieldRefs = {
    customer_name: useRef(null),
    customer_phone: useRef(null),
    city_id: useRef(null),
    area_id: useRef(null),
    password: useRef(null),
  };

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => storeApi.cities(),
  });

  const { data: areasData, isLoading: areasLoading } = useQuery({
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
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      if (user?.role === 'customer') {
        refreshProfile().catch(() => {});
      }
    },
    onError: (err) => {
      applyApiError(err);
      notifyError(err);
    },
  });

  const areas = areasData?.data || [];
  const validationCtx = {
    areasRequired: areas.length > 0,
    areasLoading: Boolean(form.city_id) && areasLoading,
    passwordRequired: createAccount && !user,
  };

  // Re-check only the field that was flagged, so its error disappears once it's fixed.
  const updateField = (field, value, extra = {}) => {
    const next = { ...form, [field]: value, ...extra };
    setForm(next);
    if (clientError?.field === field) {
      const rule = DELIVERY_RULES.find(([f]) => f === field)?.[1];
      const message = rule ? rule(next, validationCtx) : '';
      setClientError(message ? { field, message } : null);
      if (!message) dismissNotification(VALIDATION_TOAST_ID);
    }
  };

  const fieldErrorFor = (field) =>
    (clientError?.field === field ? clientError.message : '') || getFieldError(field);

  /** Fills only what was recognised; returns false when nothing could be read. */
  const handleQuickFill = async (text) => {
    const toOption = (row) => ({ value: row.id, label: row.name_ar });
    const { updates: parsed, areas: cityAreas } = await resolveQuickFill(text, {
      cities: (citiesData?.data || []).map(toOption),
      currentCityId: form.city_id,
      currentAreas: areas.map(toOption),
      loadAreas: async (cityId) => {
        const res = await queryClient.fetchQuery({
          queryKey: ['areas', cityId],
          queryFn: () => storeApi.areas(cityId),
        });
        return (res?.data || []).map(toOption);
      },
    });

    const updates = {};
    if (parsed.name) updates.customer_name = parsed.name;
    if (parsed.phone) updates.customer_phone = sanitizePhoneInput(parsed.phone);
    if ('city_id' in parsed) updates.city_id = parsed.city_id;
    if ('area_id' in parsed) updates.area_id = parsed.area_id;
    if (parsed.address) updates.address = parsed.address;

    if (Object.keys(updates).length === 0) {
      notifyError({
        message: 'تعذر التعرف على البيانات. اكتب الاسم والهاتف والعنوان كلٌ في سطر ثم حاول مجدداً',
      });
      return false;
    }

    const next = { ...form, ...updates };
    setForm(next);
    clearErrors();
    dismissNotification(VALIDATION_TOAST_ID);

    const ctx = { ...validationCtx, areasRequired: cityAreas.length > 0, areasLoading: false };
    const missing = DELIVERY_RULES.filter(([field]) => field !== 'password')
      .map(([field, rule]) => ({ field, message: rule(next, ctx) }))
      .filter((r) => r.message);

    if (missing.length === 0) {
      setClientError(null);
      notifySuccess({ message: 'تمت تعبئة البيانات بنجاح! يرجى التأكد من صحتها' });
      return true;
    }

    const labels = { customer_name: 'الاسم', customer_phone: 'رقم الهاتف', city_id: 'المدينة', area_id: 'المنطقة' };
    setClientError(missing[0]);
    notifyWarning(
      `تمت تعبئة البيانات التي تم التعرف عليها. يرجى إكمال: ${missing.map((m) => labels[m.field]).join('، ')}`
    );
    requestAnimationFrame(() => {
      const el = fieldRefs[missing[0].field]?.current;
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el?.focus?.({ preventScroll: true });
    });
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    if (items.length === 0) {
      return notifyError({
        message: isBuyNow ? 'لا يوجد منتج للطلب. عد إلى صفحة المنتج.' : 'السلة فارغة',
      });
    }

    const invalid = firstDeliveryError(form, validationCtx);
    if (invalid) {
      setClientError(invalid);
      notifyError({ message: invalid.message }, { id: VALIDATION_TOAST_ID });
      const el = fieldRefs[invalid.field]?.current;
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.focus({ preventScroll: true });
      }
      return;
    }
    setClientError(null);

    const customerPhone = normalizeLibyaPhone(form.customer_phone);

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
    return (
      <StoreLayout>
        <OrderSuccessView
          order={orderSuccess}
          whatsapp={settingsData?.data?.store_whatsapp || '218910000000'}
          onHome={() => navigate('/')}
        />
      </StoreLayout>
    );
  }

  const inputErrorClass = '!border-red-400 ring-2 ring-red-200 dark:ring-red-900/40';
  const phoneComplete = !phoneError(form.customer_phone);
  const cityOptions = (citiesData?.data || []).map((c) => ({
    value: c.id,
    label: c.name_ar,
    hint: c.shipping_price != null ? `شحن ${c.shipping_price} د.ل` : undefined,
  }));
  const areaOptions = areas.map((a) => ({ value: a.id, label: a.name_ar }));

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

        <form onSubmit={handleSubmit} noValidate className="grid md:grid-cols-2 gap-8">
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
              <QuickFillPanel onApply={handleQuickFill} />
              <div className="space-y-4">
                <div>
                  <label htmlFor="checkout-name" className="block text-sm font-medium mb-1.5">
                    الاسم الكامل
                    <RequiredMark />
                  </label>
                  <input
                    id="checkout-name"
                    ref={fieldRefs.customer_name}
                    className={`input ${fieldErrorFor('customer_name') ? inputErrorClass : ''}`}
                    placeholder="مثال: محمد أحمد"
                    autoComplete="name"
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrorFor('customer_name')) || undefined}
                    value={form.customer_name}
                    onChange={(e) => updateField('customer_name', e.target.value)}
                  />
                  <FieldError message={fieldErrorFor('customer_name')} />
                </div>
                <div>
                  <label htmlFor="checkout-phone" className="block text-sm font-medium mb-1.5">
                    رقم الهاتف
                    <RequiredMark />
                  </label>
                  <div className="relative">
                    <input
                      id="checkout-phone"
                      ref={fieldRefs.customer_phone}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      dir="ltr"
                      className={`input pl-20 text-right tabular-nums tracking-wide ${
                        fieldErrorFor('customer_phone') ? inputErrorClass : phoneComplete ? '!border-primary-500' : ''
                      }`}
                      placeholder="مثال: 0915153324"
                      aria-required="true"
                      aria-invalid={Boolean(fieldErrorFor('customer_phone')) || undefined}
                      value={form.customer_phone}
                      onChange={(e) => updateField('customer_phone', sanitizePhoneInput(e.target.value))}
                    />
                    <div className="absolute inset-y-0 left-2 flex items-center gap-1">
                      {phoneComplete && (
                        <CheckCircle2 size={20} className="text-primary-600" aria-label="رقم صحيح" />
                      )}
                      {form.customer_phone && (
                        <button
                          type="button"
                          onClick={() => {
                            updateField('customer_phone', '');
                            fieldRefs.customer_phone.current?.focus();
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-tertiary-200 hover:text-ink-700 dark:hover:bg-gray-700"
                          aria-label="مسح رقم الهاتف"
                          title="مسح الرقم"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                  {!fieldErrorFor('customer_phone') && (
                    <p className="text-xs text-gray-500 mt-1">
                      {phoneComplete ? 'تم إدخال الرقم بشكل صحيح' : '10 أرقام تبدأ بـ 091 · 092 · 093 · 094 · 095'}
                    </p>
                  )}
                  <FieldError message={fieldErrorFor('customer_phone')} />
                </div>
                <div>
                  <span className="block text-sm font-medium mb-1.5">
                    المدينة
                    <RequiredMark />
                  </span>
                  <SearchableSelect
                    ref={fieldRefs.city_id}
                    options={cityOptions}
                    value={form.city_id}
                    onChange={(cityId) => updateField('city_id', cityId, { area_id: '' })}
                    placeholder="اختر المدينة"
                    searchPlaceholder="ابحث عن مدينتك"
                    emptyText="لا توجد مدينة مطابقة للبحث"
                    invalid={Boolean(fieldErrorFor('city_id'))}
                  />
                  <FieldError message={fieldErrorFor('city_id')} />
                </div>
                {(areas.length > 0 || !form.city_id || validationCtx.areasLoading) && (
                  <div>
                    <span className="block text-sm font-medium mb-1.5">
                      المنطقة
                      <RequiredMark />
                    </span>
                    <SearchableSelect
                      ref={fieldRefs.area_id}
                      options={areaOptions}
                      value={form.area_id}
                      onChange={(areaId) => updateField('area_id', areaId)}
                      placeholder={
                        !form.city_id
                          ? 'اختر المدينة أولاً'
                          : validationCtx.areasLoading
                            ? 'جاري تحميل المناطق...'
                            : 'اختر المنطقة'
                      }
                      searchPlaceholder="ابحث عن منطقتك"
                      emptyText="لا توجد منطقة مطابقة للبحث"
                      disabled={!form.city_id || validationCtx.areasLoading}
                      invalid={Boolean(fieldErrorFor('area_id'))}
                    />
                    <FieldError message={fieldErrorFor('area_id')} />
                  </div>
                )}
                <div>
                  <label htmlFor="checkout-address" className="block text-sm font-medium mb-1.5">
                    العنوان التفصيلي <span className="font-normal text-ink-400">(اختياري)</span>
                  </label>
                  <textarea
                    id="checkout-address"
                    className="input"
                    placeholder="مثال: بجانب مسجد ...، الشارع، رقم المبنى"
                    rows={3}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                  <FieldError message={getFieldError('address')} />
                </div>
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
                      ref={fieldRefs.password}
                      type="password"
                      className={`input ${fieldErrorFor('password') ? inputErrorClass : ''}`}
                      placeholder="كلمة المرور (8 أحرف على الأقل)"
                      aria-required="true"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                    />
                    <FieldError message={fieldErrorFor('password')} />
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

function CopyButton({ text, label, copiedLabel = 'تم النسخ', className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(text);
      setCopied(true);
      notifySuccess({ message: copiedLabel });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifyError({ message: 'تعذر النسخ' });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      aria-label={copied ? copiedLabel : label}
    >
      {copied ? <Check size={16} className="shrink-0" /> : <Copy size={16} className="shrink-0" />}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}

function OrderSuccessView({ order, whatsapp, onHome }) {
  const items = order.items || [];
  const location = [order.city_name, order.area_name].filter(Boolean).join(' — ');
  const summaryText = formatOrderSummaryText(order);

  return (
    <div className="container mx-auto px-3 sm:px-4 pt-8 sm:pt-12 pb-24 md:pb-12 max-w-2xl">
      <div className="text-center mb-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl sm:text-4xl">✓</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1">
          {order.message || 'تم إنشاء الطلب'}
        </h1>
        <p className="text-sm text-ink-500">
          سيتم التواصل معك لتأكيد الطلب. الدفع عند الاستلام.
        </p>
      </div>

      <div className="card p-4 sm:p-6 mb-4">
        <p className="text-xs text-ink-500 mb-1">رقم الطلب</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-2xl sm:text-3xl font-bold text-primary-600 tabular-nums tracking-wide flex-1 min-w-0 break-all">
            {order.order_number}
          </p>
          <CopyButton
            text={order.order_number || ''}
            label="نسخ الرقم"
            copiedLabel="تم نسخ الرقم"
            className="btn-outline text-sm shrink-0 px-3 py-2"
          />
        </div>
      </div>

      <div className="card p-4 sm:p-6 mb-4 text-start">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="font-bold">ملخص الطلب</h2>
          <CopyButton
            text={summaryText}
            label="نسخ البيانات"
            copiedLabel="تم نسخ البيانات"
            className="btn-outline text-sm px-3 py-2"
          />
        </div>

        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500 shrink-0">الاسم</dt>
            <dd className="font-medium text-end break-words">{order.customer_name || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500 shrink-0">الهاتف</dt>
            <dd className="font-medium tabular-nums text-end" dir="ltr">
              {order.customer_phone || '—'}
            </dd>
          </div>
          {location ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500 shrink-0">المدينة / المنطقة</dt>
              <dd className="font-medium text-end">{location}</dd>
            </div>
          ) : null}
          {order.address ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500 shrink-0">العنوان</dt>
              <dd className="font-medium text-end break-words">{order.address}</dd>
            </div>
          ) : null}
          {order.notes ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500 shrink-0">ملاحظات</dt>
              <dd className="font-medium text-end break-words">{order.notes}</dd>
            </div>
          ) : null}
        </dl>

        <div className="border-t border-ink-100 dark:border-gray-700 mt-4 pt-4 space-y-3">
          {items.map((item) => {
            const variant = itemVariantLabel(item);
            const name = item.product_name || item.name;
            const qty = item.quantity;
            const unit = item.unit_price ?? item.price;
            const lineTotal = item.total ?? qty * unit;
            return (
              <div key={item.id || `${item.product_id}-${item.variant_id}`} className="flex gap-3 text-sm">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-tertiary-100 shrink-0 dark:bg-gray-700">
                  {item.image ? (
                    <OptimizedThumb src={item.image} alt={name} className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-ink-300">
                      —
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold line-clamp-2">{name}</p>
                  {variant ? (
                    <p className="text-xs font-medium text-primary-600 mt-0.5">{variant}</p>
                  ) : null}
                  <p className="text-ink-500 mt-0.5">
                    {qty} × {formatPrice(unit)}
                  </p>
                </div>
                <span className="font-semibold shrink-0">{formatPrice(lineTotal)}</span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-ink-100 dark:border-gray-700 mt-4 pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>المجموع</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>الشحن</span>
            <span>{formatPrice(order.shipping_cost)}</span>
          </div>
          <div className="flex justify-between font-bold text-base">
            <span>الإجمالي</span>
            <span className="text-primary-600">{formatPrice(order.total)}</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
          الدفع عند الاستلام (COD)
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <a
          href={getWhatsAppLink(whatsapp, order.order_number)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          التواصل مع المتجر عبر WhatsApp
        </a>
        <button type="button" onClick={onHome} className="btn-outline">
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
}
