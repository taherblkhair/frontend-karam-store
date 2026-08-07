import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '@core/constants';
import { OptimizedImage, OptimizedThumb } from '@shared/components/OptimizedImage';

function buildProductGallery(product) {
  const items = [];
  const seen = new Set();

  const push = (entry) => {
    if (!entry?.image || seen.has(entry.image)) return;
    seen.add(entry.image);
    items.push(entry);
  };

  push({
    id: 'primary',
    image: product.primary_image,
    hex_code: null,
    color_name: null,
  });

  for (const v of product.variants || []) {
    push({
      id: `v-${v.id}`,
      image: v.image,
      hex_code: v.hex_code || null,
      color_name: v.color_name || null,
    });
  }

  return items;
}

export function ProductCard({ product }) {
  const gallery = useMemo(() => buildProductGallery(product), [product]);
  const [activeIdx, setActiveIdx] = useState(0);
  const active = gallery[Math.min(activeIdx, Math.max(gallery.length - 1, 0))];
  const hasDiscount =
    product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price);
  const showVariantPicker = gallery.length > 1;

  return (
    <Link
      to={`/products/${product.slug || product.id}`}
      className="card group overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="aspect-square overflow-hidden">
        {active?.image ? (
          <OptimizedImage
            src={active.image}
            alt={product.name_ar}
            className="w-full h-full"
            imgClassName="group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            widths={[400, 800]}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-tertiary-100 text-ink-300 text-sm">
            لا توجد صورة
          </div>
        )}
      </div>

      {showVariantPicker && (
        <div
          className="px-2 pt-2 flex items-center gap-1.5 overflow-x-auto"
          onClick={(e) => e.preventDefault()}
        >
          {gallery.slice(0, 6).map((item, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={item.id}
                type="button"
                title={item.color_name || 'صورة'}
                aria-label={item.color_name || `صورة ${idx + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveIdx(idx);
                }}
                className={`shrink-0 rounded-md overflow-hidden border-2 transition w-9 h-9 ${
                  isActive
                    ? 'border-primary-500 ring-1 ring-primary-500'
                    : 'border-gray-200 dark:border-gray-600 hover:border-primary-300'
                }`}
              >
                <OptimizedThumb src={item.image} alt="" className="w-full h-full" />
              </button>
            );
          })}
          {gallery.length > 6 && (
            <span className="text-xs text-gray-400 shrink-0">+{gallery.length - 6}</span>
          )}
        </div>
      )}
      <div className="p-4">
        <h3 className="font-medium line-clamp-2 mb-2">{product.name_ar}</h3>

        {showVariantPicker && (
          <div
            className="flex items-center gap-1.5 mb-2 flex-wrap"
            onClick={(e) => e.preventDefault()}
          >
            {gallery.slice(0, 6).map((item, idx) => (
              <button
                key={`swatch-${item.id}`}
                type="button"
                title={item.color_name || undefined}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveIdx(idx);
                }}
                className={`w-4 h-4 rounded-full border ${
                  idx === activeIdx
                    ? 'ring-2 ring-primary-500 ring-offset-1'
                    : 'border-gray-300 dark:border-gray-500'
                }`}
                style={{ backgroundColor: item.hex_code || '#e5e7eb' }}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-primary-600 font-bold">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.compare_price)}
            </span>
          )}
        </div>
        {product.total_stock <= 0 && (
          <span className="badge bg-red-100 text-red-700 mt-2">نفذ المخزون</span>
        )}
      </div>
    </Link>
  );
}

export function StatCard({ title, value, icon: Icon, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/30',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/30',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30',
  };

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-500 mb-1 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold truncate">{value}</p>
        </div>
        <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${colors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
}

export function EmptyState({ message }) {
  return (
    <div className="text-center py-20 text-gray-500">
      <p>{message}</p>
    </div>
  );
}

export function OrderStatusBadge({ status }) {
  const statuses = {
    new: { label: 'جديد', color: 'bg-blue-100 text-blue-800' },
    pending_confirmation: { label: 'قيد التأكيد', color: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'تم التأكيد', color: 'bg-green-100 text-green-800' },
    processing: { label: 'قيد التجهيز', color: 'bg-purple-100 text-purple-800' },
    shipped: { label: 'تم الشحن', color: 'bg-indigo-100 text-indigo-800' },
    delivered: { label: 'تم التسليم', color: 'bg-emerald-100 text-emerald-800' },
    cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
    returned: { label: 'مرتجع', color: 'bg-orange-100 text-orange-800' },
  };
  const s = statuses[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  return <span className={`badge ${s.color}`}>{s.label}</span>;
}

export function FormAlert({ message }) {
  if (!message) return null;
  return (
    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-800" role="alert">
      {message}
    </div>
  );
}

export function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-sm text-red-500 mt-1">{message}</p>;
}

export function Modal({ open, onClose, title, children, size = 'md', alert }) {
  const sizes = {
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full',
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className={`relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-xl w-full ${sizes[size] || sizes.md} max-h-[min(100dvh,920px)] sm:max-h-[90vh] overflow-hidden flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b dark:border-gray-700 shrink-0">
          <h2 className="text-base sm:text-lg font-bold truncate">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 -m-1 rounded-lg"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 safe-pb">
          {alert ? (
            <div className="mb-4">
              <FormAlert message={alert} />
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
