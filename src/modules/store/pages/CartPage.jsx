import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  Truck,
} from 'lucide-react';
import StoreLayout from '@shared/layouts/StoreLayout';
import { useCart } from '@modules/store/context/CartContext';
import { formatPrice } from '@core/constants';
import { OptimizedThumb } from '@shared/components/OptimizedImage';
import { useConfirm } from '@shared/hooks/useConfirm';
import { storeApi } from '@modules/store/api/store.api';
import { StoreProductSection } from '@modules/store/components/StoreProductCard';
import { notifySuccess } from '@shared/services/toast.service';

const itemsLabel = (n) => (n === 1 ? 'قطعة واحدة' : n === 2 ? 'قطعتان' : n <= 10 ? `${n} قطع` : `${n} قطعة`);

function EmptyCart() {
  const { data: suggestions = [] } = useQuery({
    queryKey: ['cart-empty-suggestions'],
    queryFn: () => storeApi.products({ featured: 'true', limit: 4, page: 1 }),
    select: (res) => res?.data || [],
    staleTime: 5 * 60_000,
  });

  return (
    <>
      <section className="container mx-auto px-4 pt-10 pb-6 sm:pt-16">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="relative mb-7 h-40 w-40 sm:h-44 sm:w-44" aria-hidden>
            <span className="absolute inset-3 rounded-full bg-secondary-400/25 motion-safe:animate-ping [animation-duration:2.6s]" />
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-50 to-tertiary-200 ring-1 ring-primary-600/10 dark:from-primary-900/40 dark:to-gray-800" />
            <span className="absolute left-[calc(50%-12px)] top-7 text-secondary-500 motion-safe:animate-[karam-drop_2.8s_ease-in_infinite]">
              <ShoppingBag size={24} strokeWidth={2.25} />
            </span>
            <span className="absolute left-[30%] top-6 text-primary-400 motion-safe:animate-[karam-drop_2.8s_ease-in_1.4s_infinite] opacity-0">
              <Sparkles size={18} />
            </span>
            <span className="absolute inset-0 flex items-center justify-center pt-6 text-primary-600 motion-safe:animate-[karam-float_3s_ease-in-out_infinite] dark:text-primary-300">
              <ShoppingCart size={64} strokeWidth={1.6} />
            </span>
          </div>

          <h2 className="font-display text-2xl font-bold text-ink-800 sm:text-3xl dark:text-gray-100">سلتك فارغة حالياً</h2>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500 sm:text-base dark:text-gray-400">
            تصفّح أحدث الحقائب والعروض المميزة وأضف ما يعجبك إلى السلة.
          </p>

          <Link
            to="/products"
            className="group mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary-600 px-8 text-base font-bold text-white shadow-lg shadow-primary-600/25 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            <ShoppingBag size={20} />
            ابدأ التسوق الآن
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          </Link>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              to="/products?is_new=true"
              className="rounded-full border border-ink-100 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-primary-600/40 hover:text-primary-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              وصل حديثاً
            </Link>
            <Link
              to="/products?featured=true"
              className="rounded-full border border-secondary-400/60 bg-secondary-50 px-4 py-2 text-sm font-medium text-ink-800 transition hover:border-secondary-500 dark:bg-gray-800 dark:text-gray-200"
            >
              عروض مميزة
            </Link>
            <Link
              to="/brands"
              className="rounded-full border border-ink-100 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-primary-600/40 hover:text-primary-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              البراندات
            </Link>
          </div>
        </div>
      </section>

      <StoreProductSection title="قد يعجبك" to="/products?featured=true" products={suggestions} badge="مميز" className="!pt-4" />
    </>
  );
}

function QuantityStepper({ item, onChange }) {
  const atMax = item.stock > 0 && item.quantity >= item.stock;
  return (
    <div className="flex h-10 items-center rounded-xl border border-ink-200 bg-white dark:border-gray-600 dark:bg-gray-800">
      <button
        type="button"
        onClick={() => onChange(item.quantity + 1)}
        disabled={atMax}
        aria-label="زيادة الكمية"
        className="flex h-full w-10 items-center justify-center rounded-s-xl text-primary-600 transition hover:bg-primary-50 disabled:text-ink-200 disabled:hover:bg-transparent dark:hover:bg-primary-900/30"
      >
        <Plus size={16} />
      </button>
      <span className="w-8 text-center text-sm font-bold tabular-nums text-ink-800 dark:text-gray-100" aria-live="polite">
        {item.quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(item.quantity - 1)}
        disabled={item.quantity <= 1}
        aria-label="تقليل الكمية"
        className="flex h-full w-10 items-center justify-center rounded-e-xl text-primary-600 transition hover:bg-primary-50 disabled:text-ink-200 disabled:hover:bg-transparent dark:hover:bg-primary-900/30"
      >
        <Minus size={16} />
      </button>
    </div>
  );
}

function CartItem({ item, onQuantity, onRemove }) {
  const variantParts = [
    item.color_name && { label: 'اللون', value: item.color_name },
    item.size_name && { label: 'المقاس', value: item.size_name },
  ].filter(Boolean);
  const hasCompare = item.compare_price > item.price;
  const unavailable = !(item.stock > 0);
  const atMax = !unavailable && item.quantity >= item.stock;

  return (
    <li className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
      <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-tertiary-100 sm:h-32 sm:w-28 dark:bg-gray-700">
        {item.image ? (
          <OptimizedThumb src={item.image} alt={item.name} className={`h-full w-full ${unavailable ? 'opacity-50 grayscale' : ''}`} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink-300">لا صورة</div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-sm font-bold leading-snug text-ink-800 line-clamp-2 sm:text-base dark:text-gray-100">
              {item.name}
            </h3>
            {variantParts.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {variantParts.map((part) => (
                  <span
                    key={part.label}
                    className="rounded-md bg-tertiary-100 px-2 py-0.5 text-[11px] font-medium text-ink-600 sm:text-xs dark:bg-gray-700 dark:text-gray-300"
                  >
                    {part.label}: <span className="font-bold text-ink-800 dark:text-gray-100">{part.value}</span>
                  </span>
                ))}
              </div>
            ) : item.variant_info ? (
              <p className="mt-1 text-xs text-ink-500">{item.variant_info}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`حذف ${item.name} من السلة`}
            className="-me-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
          >
            <Trash2 size={17} />
          </button>
        </div>

        <div className="mt-1.5 flex items-baseline gap-2 text-xs sm:text-sm">
          <span className="font-medium text-ink-500 tabular-nums dark:text-gray-400">{formatPrice(item.price)}</span>
          {hasCompare && <span className="text-ink-300 line-through tabular-nums">{formatPrice(item.compare_price)}</span>}
          {unavailable && <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-bold text-white">غير متوفر</span>}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <QuantityStepper item={item} onChange={onQuantity} />
          <span className="text-base font-extrabold tabular-nums text-primary-600 sm:text-lg dark:text-primary-300">
            {formatPrice(item.price * item.quantity)}
          </span>
        </div>
        {atMax && item.quantity > 1 && (
          <p className="mt-1.5 text-[11px] font-medium text-secondary-700 dark:text-secondary-300">
            وصلت للحد الأقصى المتوفر ({item.stock})
          </p>
        )}
      </div>
    </li>
  );
}

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, subtotal, itemCount } = useCart();
  const confirm = useConfirm();

  const savings = items.reduce(
    (sum, i) => sum + (i.compare_price > i.price ? (i.compare_price - i.price) * i.quantity : 0),
    0
  );

  const handleRemove = (item) => {
    removeItem(item.key);
    notifySuccess({ message: `تم حذف «${item.name}» من السلة` });
  };

  const handleClear = async () => {
    const ok = await confirm({
      title: 'إفراغ السلة',
      message: 'سيتم حذف كل المنتجات من السلة. هل تريد المتابعة؟',
      confirmText: 'إفراغ السلة',
    });
    if (ok) clearCart();
  };

  if (items.length === 0) {
    return (
      <StoreLayout>
        <div className="container mx-auto px-4 pt-6 sm:pt-8">
          <h1 className="font-display text-2xl font-bold text-primary-600 sm:text-3xl">سلة التسوق</h1>
        </div>
        <EmptyCart />
      </StoreLayout>
    );
  }

  const checkoutButton = (className = '') => (
    <Link
      to="/checkout"
      className={`btn-primary inline-flex items-center justify-center gap-2 rounded-xl font-bold ${className}`}
    >
      إتمام الطلب
      <ArrowLeft size={18} />
    </Link>
  );

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 pb-44 pt-6 sm:pt-8 md:pb-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-primary-600 sm:text-3xl">سلة التسوق</h1>
            <p className="mt-1 text-sm text-ink-400">{itemsLabel(itemCount)} في سلتك</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/products"
              className="rounded-full px-3 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-50 dark:hover:bg-primary-900/30"
            >
              متابعة التسوق
            </Link>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            >
              <Trash2 size={15} />
              إفراغ السلة
            </button>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-3 lg:gap-8">
          <ul className="space-y-3 sm:space-y-4 lg:col-span-2" aria-label="منتجات السلة">
            {items.map((item) => (
              <CartItem
                key={item.key}
                item={item}
                onQuantity={(q) => updateQuantity(item.key, q)}
                onRemove={() => handleRemove(item)}
              />
            ))}
          </ul>

          <aside className="card p-5 sm:p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-bold text-ink-800 dark:text-gray-100">ملخص الطلب</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500 dark:text-gray-400">المجموع الفرعي ({itemsLabel(itemCount)})</dt>
                <dd className="font-semibold tabular-nums text-ink-800 dark:text-gray-100">{formatPrice(subtotal)}</dd>
              </div>
              {savings > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500 dark:text-gray-400">التوفير</dt>
                  <dd className="font-semibold tabular-nums text-primary-600">− {formatPrice(savings)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500 dark:text-gray-400">التوصيل</dt>
                <dd className="text-ink-500 dark:text-gray-400">يُحسب عند إتمام الطلب</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-ink-100 pt-4 dark:border-gray-700">
                <dt className="text-base font-bold text-ink-800 dark:text-gray-100">الإجمالي</dt>
                <dd className="text-2xl font-extrabold tabular-nums text-primary-600 dark:text-primary-300">{formatPrice(subtotal)}</dd>
              </div>
            </dl>

            {checkoutButton('mt-5 hidden h-12 w-full text-base md:inline-flex')}

            <ul className="mt-5 space-y-2.5 border-t border-ink-100 pt-4 text-xs text-ink-500 dark:border-gray-700 dark:text-gray-400">
              <li className="flex items-center gap-2">
                <ShieldCheck size={16} className="shrink-0 text-primary-600" />
                الدفع عند الاستلام — ادفع عندما يصلك طلبك
              </li>
              <li className="flex items-center gap-2">
                <Truck size={16} className="shrink-0 text-primary-600" />
                رسوم التوصيل تُحدد حسب منطقتك عند إتمام الطلب
              </li>
            </ul>
          </aside>
        </div>
      </div>

      {/* Mobile checkout bar — sits above the bottom tab nav */}
      <div
        className="fixed inset-x-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur-md md:hidden dark:border-gray-700 dark:bg-ink-900/95"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="container mx-auto flex items-center gap-3 px-4 py-2.5">
          <div className="shrink-0 leading-tight">
            <p className="text-[11px] text-ink-400">الإجمالي · {itemsLabel(itemCount)}</p>
            <p className="text-lg font-extrabold tabular-nums text-primary-600 dark:text-primary-300">{formatPrice(subtotal)}</p>
          </div>
          {checkoutButton('h-12 flex-1 text-base')}
        </div>
      </div>
    </StoreLayout>
  );
}
