import { formatPrice } from '@core/constants';
import { ProductThumb } from './ProductThumb';

export function ProductTile({ product, onSelect, loading }) {
  const stock = product.total_stock ?? 0;
  const outOfStock = stock <= 0;

  return (
    <button
      type="button"
      disabled={outOfStock || loading}
      onClick={() => onSelect(product)}
      className={`group text-right rounded-xl border overflow-hidden transition bg-white dark:bg-gray-800 ${
        outOfStock
          ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:shadow-md active:scale-[0.98]'
      }`}
    >
      <div className="aspect-square relative overflow-hidden bg-gray-50 dark:bg-gray-700">
        <ProductThumb
          src={product.primary_image}
          alt={product.name_ar}
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
        {loading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-black/40 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        )}
        {outOfStock ? (
          <span className="absolute top-2 left-2 text-[11px] font-medium px-2 py-0.5 rounded-md bg-red-600 text-white">
            نفذ
          </span>
        ) : (
          <span className="absolute top-2 left-2 text-[11px] font-medium px-2 py-0.5 rounded-md bg-black/60 text-white">
            {stock}
          </span>
        )}
      </div>
      <div className="p-2.5 space-y-1">
        <p className="text-sm font-medium line-clamp-2 min-h-[2.5rem] leading-snug">{product.name_ar}</p>
        <p className="text-primary-600 font-bold text-sm">{formatPrice(product.price)}</p>
      </div>
    </button>
  );
}
