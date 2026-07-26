import { Link } from 'react-router-dom';
import { formatPrice } from '@core/constants';

export function ProductCard({ product }) {
  const hasDiscount = product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price);

  return (
    <Link to={`/products/${product.slug || product.id}`} className="card group overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name_ar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">لا توجد صورة</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium line-clamp-2 mb-2">{product.name_ar}</h3>
        <div className="flex items-center gap-2">
          <span className="text-primary-600 font-bold">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(product.compare_price)}</span>
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
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon size={24} />
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
  const sizes = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${sizes[size] || sizes.md} max-h-[90vh] overflow-auto`}>
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6">
          {alert ? <div className="mb-4"><FormAlert message={alert} /></div> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
