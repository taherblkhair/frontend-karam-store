import { Package } from 'lucide-react';
import { LoadingSpinner } from '@shared/ui';
import { ProductTile } from './ProductTile';

export function ProductSelector({
  isSearching,
  listLoading,
  displayProducts,
  pickingId,
  onSelectProduct,
}) {
  return (
    <section className="lg:col-span-8 flex flex-col min-h-0 card overflow-hidden">
      <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-semibold">
          {isSearching ? 'نتائج البحث' : 'منتجات جاهزة'}
        </h2>
        <span className="text-xs text-gray-500">
          {isSearching ? 'حتى 5 نتائج' : '10 منتجات'}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {listLoading ? (
          <LoadingSpinner />
        ) : displayProducts.length === 0 ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-gray-500 gap-2">
            <Package size={40} className="opacity-40" />
            <p>{isSearching ? 'لا توجد نتائج' : 'لا توجد منتجات'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {displayProducts.map((p) => (
              <ProductTile
                key={p.id}
                product={p}
                onSelect={onSelectProduct}
                loading={pickingId === p.id}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
