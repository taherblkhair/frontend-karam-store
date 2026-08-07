import { StoreProductCard } from '@modules/store/components/StoreProductCard';

/** Catalog listing card — unified storefront design pattern. */
export function ProductCard({ product, badge, showNewBadge }) {
  return (
    <StoreProductCard product={product} badge={badge} showNewBadge={showNewBadge} />
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
