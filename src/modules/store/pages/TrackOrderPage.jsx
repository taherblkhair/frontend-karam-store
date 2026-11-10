import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Copy,
  PackageCheck,
  PackageSearch,
  Share2,
  Truck,
  XCircle,
} from 'lucide-react';
import StoreLayout from '@shared/layouts/StoreLayout';
import { FieldError, FormAlert } from '@shared/ui';
import { OptimizedThumb } from '@shared/components/OptimizedImage';
import { formatPrice, getWhatsAppLink } from '@core/constants';
import { useAuth } from '@core/auth/AuthContext';
import { storeApi } from '@modules/store/api/store.api';
import { storeSettingsQuery } from '@modules/store/api/storeSettings.query';
import { parseApiError } from '@shared/utils/apiMessage.js';
import {
  LIBYA_PHONE_MESSAGE,
  isValidLibyaMobile,
  normalizeLibyaPhone,
  sanitizePhoneInput,
} from '@shared/utils/phone';
import {
  TRACK_ORDER_PATH,
  trackOrderAbsoluteUrl,
  trackOrderWhatsAppShareUrl,
} from '@modules/store/utils/trackOrder';

const STEP_ICONS = [ClipboardCheck, PackageSearch, Truck, PackageCheck];

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Four short steps; cancelled / returned orders get a clear notice instead. */
function TrackingSteps({ steps = [], stage }) {
  const stopped = stage.state === 'cancelled' || stage.state === 'returned';
  return (
    <ol className="grid grid-cols-4 gap-1 sm:gap-2" aria-label="مراحل الطلب">
      {steps.map((step, i) => {
        const n = i + 1;
        const done = !stopped && n < stage.step;
        const current = !stopped && n === stage.step;
        const reached = done || current || stage.state === 'delivered';
        const Icon = STEP_ICONS[i] || Check;
        return (
          <li key={step.key} className="flex flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
            <div className="relative flex w-full items-center justify-center">
              {i > 0 ? (
                <span
                  className={`absolute end-1/2 top-1/2 h-1 w-full -translate-y-1/2 rounded-full ${
                    reached ? 'bg-primary-600' : 'bg-ink-100 dark:bg-gray-700'
                  }`}
                  aria-hidden
                />
              ) : null}
              <span
                className={`relative z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 transition ${
                  reached
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-ink-200 bg-white text-ink-300 dark:border-gray-600 dark:bg-gray-800'
                } ${current && stage.state !== 'delivered' ? 'ring-4 ring-primary-600/20' : ''}`}
              >
                {done || (stage.state === 'delivered' && n <= 4) ? <Check size={20} /> : <Icon size={20} />}
              </span>
            </div>
            <span
              className={`mt-2 text-[11px] sm:text-sm leading-tight font-semibold ${
                reached ? 'text-ink-800 dark:text-gray-100' : 'text-ink-400'
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CopyLinkButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked — the WhatsApp button still works */
        }
      }}
      className="btn-outline"
    >
      {copied ? <Check size={18} /> : <Copy size={18} />}
      {copied ? 'تم نسخ الرابط' : 'نسخ رابط التتبع'}
    </button>
  );
}

function TrackingResult({ result, storeName, storeWhatsapp }) {
  const { stage } = result;
  const stopped = stage.state === 'cancelled' || stage.state === 'returned';

  return (
    <div className="space-y-4">
      <section className="card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <p className="text-xs text-ink-500 mb-1">رقم الطلب</p>
            <p className="text-xl sm:text-2xl font-bold text-primary-600 tabular-nums break-all" dir="ltr">
              {result.order_number}
            </p>
            <p className="text-sm text-ink-500 mt-1">تاريخ الطلب: {formatDate(result.created_at)}</p>
          </div>
          <span
            className={`badge text-sm px-3 py-1 ${
              stopped
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                : stage.state === 'delivered'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                  : 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
            }`}
          >
            {stage.label}
          </span>
        </div>

        {stopped ? (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
            <XCircle size={20} className="shrink-0 mt-0.5" />
            <p>
              {stage.state === 'cancelled'
                ? 'تم إلغاء هذا الطلب. للاستفسار تواصل مع المتجر.'
                : 'تم إرجاع هذا الطلب. للاستفسار تواصل مع المتجر.'}
            </p>
          </div>
        ) : (
          <TrackingSteps steps={result.steps} stage={stage} />
        )}

        {result.tracking_number || result.shipment_status_label ? (
          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-tertiary-100 p-3 text-sm dark:bg-gray-700/40">
            {result.tracking_number ? (
              <div>
                <dt className="text-ink-500 text-xs">رقم تتبع الشحنة</dt>
                <dd className="font-semibold tabular-nums" dir="ltr">{result.tracking_number}</dd>
              </div>
            ) : null}
            {result.shipment_status_label ? (
              <div>
                <dt className="text-ink-500 text-xs">حالة الشحنة لدى شركة التوصيل</dt>
                <dd className="font-semibold">{result.shipment_status_label}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </section>

      <section className="card p-4 sm:p-6">
        <h2 className="font-bold mb-4">المنتجات</h2>
        <ul className="space-y-3">
          {result.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-tertiary-100 shrink-0 dark:bg-gray-700">
                {item.image ? (
                  <OptimizedThumb src={item.image} alt={item.product_name} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-ink-300">—</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold line-clamp-2">{item.product_name}</p>
                {item.variant_info ? <p className="text-xs font-medium text-primary-600 mt-0.5">{item.variant_info}</p> : null}
                <p className="text-ink-500 mt-0.5">
                  الكمية: {item.quantity}
                  {item.item_status === 'cancelled' ? ' · ملغي' : item.item_status === 'returned' ? ' · مرتجع' : ''}
                </p>
              </div>
              <span className="font-semibold shrink-0">{formatPrice(item.total)}</span>
            </li>
          ))}
        </ul>

        <div className="border-t border-ink-100 dark:border-gray-700 mt-4 pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>المجموع</span>
            <span>{formatPrice(result.subtotal)}</span>
          </div>
          {Number(result.discount) > 0 ? (
            <div className="flex justify-between text-green-700 dark:text-green-300">
              <span>الخصم</span>
              <span>- {formatPrice(result.discount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span>الشحن{result.city_name ? ` (${result.city_name})` : ''}</span>
            <span>{formatPrice(result.shipping_cost)}</span>
          </div>
          <div className="flex justify-between font-bold text-base">
            <span>الإجمالي</span>
            <span className="text-primary-600">{formatPrice(result.total)}</span>
          </div>
          <p className="text-xs text-ink-500">الدفع عند الاستلام</p>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={trackOrderWhatsAppShareUrl(result, storeName)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex-1"
        >
          <Share2 size={18} /> مشاركة رابط التتبع عبر واتساب
        </a>
        <CopyLinkButton text={trackOrderAbsoluteUrl(result)} />
        {storeWhatsapp ? (
          <a
            href={getWhatsAppLink(storeWhatsapp, result.order_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            تواصل مع المتجر
          </a>
        ) : null}
      </div>
    </div>
  );
}

/** Phone-only lookup: recent orders for that number; tapping one opens its tracking. */
function OrdersList({ orders, onOpen, loadingNumber }) {
  return (
    <section className="card p-2 sm:p-3 mb-4">
      <h2 className="font-bold px-2 pt-2 pb-3">طلباتك الأخيرة ({orders.length})</h2>
      <ul className="divide-y divide-ink-100 dark:divide-gray-700">
        {orders.map((o) => {
          const stopped = o.stage.state === 'cancelled' || o.stage.state === 'returned';
          return (
            <li key={o.order_number}>
              <button
                type="button"
                onClick={() => onOpen(o)}
                disabled={Boolean(loadingNumber)}
                className="w-full flex items-center gap-3 p-3 text-start rounded-xl hover:bg-tertiary-100 dark:hover:bg-gray-700/40 transition disabled:opacity-60"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold tabular-nums text-primary-600" dir="ltr">{o.order_number}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {formatDate(o.created_at)} · {o.items_count} قطعة · {formatPrice(o.total)}
                  </p>
                </div>
                <span
                  className={`badge shrink-0 ${
                    stopped
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                      : o.stage.state === 'delivered'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                        : 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                  }`}
                >
                  {loadingNumber === o.order_number ? 'جاري الفتح...' : o.stage.label}
                </span>
                <ChevronLeft size={18} className="text-ink-400 shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * /track-order — guest-first order tracking.
 * Look up by phone only (list of recent orders), by order / shipping tracking number + phone,
 * or open a shared link (?order=…&t=…). Read-only: nothing here can change an order.
 */
export default function TrackOrderPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const linkOrder = params.get('order') || '';
  const linkToken = params.get('t') || '';

  const [query, setQuery] = useState(linkOrder);
  const [phone, setPhone] = useState(() => sanitizePhoneInput(user?.phone || ''));
  const [phoneError, setPhoneError] = useState('');
  const [orders, setOrders] = useState(null); // phone-only results
  const [openingNumber, setOpeningNumber] = useState(null);

  const { data: settingsData } = useQuery({ ...storeSettingsQuery, staleTime: 60_000 });
  const settings = settingsData?.data || {};

  const track = useMutation({
    mutationFn: storeApi.trackOrder,
    onError: () => setOpeningNumber(null),
    onSuccess: (res) => {
      const r = res?.data;
      setOpeningNumber(null);
      if (Array.isArray(r?.orders)) {
        setOrders(r.orders);
        return;
      }
      // Keep a shareable URL in the address bar (token, never the phone)
      if (r?.order_number && r?.tracking_token) {
        setParams({ order: r.order_number, t: r.tracking_token }, { replace: true });
      }
    },
  });

  // Shared link → load straight away
  useEffect(() => {
    // Skip when this link is the one we just wrote after a phone lookup
    if (linkOrder && linkToken && !track.isPending && track.data?.data?.order_number !== linkOrder) {
      track.mutate({ query: linkOrder, token: linkToken });
    }
  }, [linkOrder, linkToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault();
    const normalized = normalizeLibyaPhone(phone);
    if (!isValidLibyaMobile(normalized)) {
      setPhoneError(LIBYA_PHONE_MESSAGE);
      return;
    }
    setPhoneError('');
    setOrders(null);
    track.mutate({ query: query.trim() || undefined, phone: normalized });
  };

  const openFromList = (o) => {
    setOpeningNumber(o.order_number);
    track.mutate({ query: o.order_number, token: o.tracking_token });
  };

  const data = track.data?.data;
  const result = data && !Array.isArray(data.orders) ? data : null;
  const error = track.error ? parseApiError(track.error).message : '';

  return (
    <StoreLayout>
      <div className="container mx-auto px-3 sm:px-4 pt-6 sm:pt-10 pb-24 md:pb-12 max-w-2xl">
        <header className="mb-5 sm:mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30">
            <Truck size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">تتبع طلبك</h1>
          <p className="text-sm text-ink-500 mt-1">بدون تسجيل دخول — يكفي رقم الهاتف المستخدم عند الطلب</p>
        </header>

        {!result && !orders ? (
          <form onSubmit={submit} className="card p-4 sm:p-6 space-y-4 mb-4" noValidate>
            {error ? <FormAlert message={error} /> : null}
            <div>
              <label htmlFor="track-phone" className="block text-sm font-medium mb-1.5">
                رقم الهاتف
              </label>
              <input
                id="track-phone"
                className="input"
                dir="ltr"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0912345678"
                value={phone}
                onChange={(e) => {
                  setPhone(sanitizePhoneInput(e.target.value));
                  setPhoneError('');
                }}
                required
              />
              <FieldError message={phoneError} />
            </div>
            <div>
              <label htmlFor="track-query" className="block text-sm font-medium mb-1.5">
                رقم الطلب أو رقم التتبع <span className="text-ink-400 font-normal">(اختياري)</span>
              </label>
              <input
                id="track-query"
                className="input"
                dir="ltr"
                inputMode="text"
                autoComplete="off"
                placeholder="ORD-261110-1234"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button type="submit" disabled={track.isPending || !phone} className="btn-primary w-full">
              {track.isPending ? 'جاري البحث...' : 'تتبع الطلب'}
            </button>
          </form>
        ) : null}

        {track.isPending && linkToken && !result ? (
          <p className="text-center text-sm text-ink-500">جاري تحميل الطلب...</p>
        ) : null}

        {orders && !result ? (
          <>
            <OrdersList orders={orders} onOpen={openFromList} loadingNumber={openingNumber} />
            {error ? <FormAlert message={error} /> : null}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setOrders(null);
                  track.reset();
                }}
                className="text-sm text-primary-600 underline underline-offset-4"
              >
                بحث برقم آخر
              </button>
            </div>
          </>
        ) : null}

        {result ? (
          <>
            {orders ? (
              <button
                type="button"
                onClick={() => {
                  track.reset();
                  setParams({}, { replace: true });
                }}
                className="mb-3 text-sm text-primary-600 hover:underline"
              >
                → العودة لقائمة طلباتك
              </button>
            ) : null}
            <TrackingResult
              result={result}
              storeName={settings.store_name || 'متجر كرم'}
              storeWhatsapp={settings.store_whatsapp}
            />
            <div className="mt-4 text-center">
              <Link
                to={TRACK_ORDER_PATH}
                onClick={() => {
                  track.reset();
                  setOrders(null);
                  setQuery('');
                }}
                className="text-sm text-primary-600 underline underline-offset-4"
              >
                تتبع طلب آخر
              </Link>
            </div>
          </>
        ) : null}

        {!result && !orders && !track.isPending ? (
          <p className="mt-4 flex items-start gap-2 text-xs text-ink-500">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-primary-600" />
            أدخل رقم الهاتف لعرض آخر طلباتك، أو أضف رقم الطلب للوصول لطلب محدد. صفحة التتبع للعرض فقط ولا تسمح بتعديل الطلب.
          </p>
        ) : null}
      </div>
    </StoreLayout>
  );
}
