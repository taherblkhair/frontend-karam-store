import { Plus, Minus, Trash2, Package } from 'lucide-react';
import { formatPrice } from '@core/constants';
import { getCartKey } from '@modules/sales/utils/cart';
import { ProductThumb } from './ProductThumb';

const stepBtn =
  'flex h-9 w-9 items-center justify-center transition hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-700';

export function CartTable({ cart, onUpdateQty, onRemove }) {
  if (cart.length === 0) {
    return (
      <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 py-6 text-sm text-gray-500">
        <Package size={32} className="opacity-40" />
        <p>اضغط على منتج لإضافته</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" aria-label="منتجات السلة">
      {cart.map((item) => {
        const atMax = item.quantity >= item.stock;
        return (
          <li
            key={getCartKey(item)}
            className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-2 dark:border-gray-700 dark:bg-gray-900/40"
          >
            <ProductThumb src={item.image} alt={item.name} className="h-16 w-16 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{item.name}</p>
                  {item.variant_info && (
                    <p className="text-xs font-medium text-primary-600">{item.variant_info}</p>
                  )}
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatPrice(item.price)} · متوفر {item.stock}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label={`حذف ${item.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="inline-flex items-center overflow-hidden rounded-lg border bg-white dark:border-gray-600 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item, 1)}
                    disabled={atMax}
                    className={stepBtn}
                    aria-label="زيادة الكمية"
                  >
                    <Plus size={15} />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item, -1)}
                    disabled={item.quantity <= 1}
                    className={stepBtn}
                    aria-label="تقليل الكمية"
                  >
                    <Minus size={15} />
                  </button>
                </div>
                <span className="text-sm font-bold tabular-nums text-primary-600">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
