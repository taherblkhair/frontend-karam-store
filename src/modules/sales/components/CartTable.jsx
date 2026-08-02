import { Plus, Minus, Trash2, Package } from 'lucide-react';
import { formatPrice } from '@core/constants';
import { getCartKey } from '@modules/sales/utils/cart';
import { ProductThumb } from './ProductThumb';

export function CartTable({ cart, onUpdateQty, onRemove }) {
  return (
    <div className="flex-1 overflow-auto p-3 space-y-2">
      {cart.length === 0 ? (
        <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-gray-500 gap-2 text-sm">
          <Package size={32} className="opacity-40" />
          <p>اضغط على منتج لإضافته</p>
        </div>
      ) : (
        cart.map((item) => (
          <div
            key={getCartKey(item)}
            className="flex gap-3 p-2 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40"
          >
            <ProductThumb
              src={item.image}
              alt={item.name}
              className="w-14 h-14 rounded-lg shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.variant_info && (
                    <p className="text-xs text-primary-600 font-medium">{item.variant_info}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatPrice(item.price)} · متوفر {item.stock}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  className="text-red-500 p-1 shrink-0 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  aria-label="حذف"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="inline-flex items-center gap-1 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800">
                  <button type="button" onClick={() => onUpdateQty(item, -1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg">
                    <Minus size={14} />
                  </button>
                  <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                  <button type="button" onClick={() => onUpdateQty(item, 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg">
                    <Plus size={14} />
                  </button>
                </div>
                <span className="text-sm font-bold text-primary-600">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
