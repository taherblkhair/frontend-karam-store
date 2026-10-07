import { Package } from 'lucide-react';
import { LoadingSpinner } from '@shared/ui';
import { LoadMoreFooter } from '@modules/store/components/LoadMoreProducts';
import { POS_PAGE_SIZE } from '@modules/sales/hooks/usePosProducts';
import { ProductTile } from './ProductTile';

export function ProductSelector({
  isSearching,
  list,
  pickingId,
  onSelectProduct,
  cartQtyByProduct = {},
}) {
  const { products, total, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = list;

  return (
    <section className="card flex flex-col lg:col-span-8 lg:min-h-0 lg:overflow-hidden">
      <div className="flex items-center justify-between border-b px-3 py-2.5 sm:px-4 sm:py-3 dark:border-gray-700">
        <h2 className="font-semibold">
          {isSearching ? 'نتائج البحث' : 'منتجات جاهزة'}
        </h2>
        {!isLoading && total != null && (
          <span className="text-xs tabular-nums text-gray-500">
            {products.length} من {total} منتج
          </span>
        )}
      </div>

      <div className="p-2 sm:p-3 lg:flex-1 lg:overflow-auto">
        {isLoading ? (
          <LoadingSpinner />
        ) : products.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-gray-500 lg:h-full">
            <Package size={40} className="opacity-40" />
            <p>{isSearching ? 'لا توجد نتائج' : 'لا توجد منتجات'}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductTile
                  key={p.id}
                  product={p}
                  onSelect={onSelectProduct}
                  loading={pickingId === p.id}
                  inCart={cartQtyByProduct[p.id] || 0}
                />
              ))}
              {isFetchingNextPage &&
                Array.from({ length: 4 }, (_, i) => (
                  <div
                    key={`sk-${i}`}
                    className="aspect-[3/4] animate-pulse rounded-xl border border-gray-100 bg-gray-100 dark:border-gray-700 dark:bg-gray-700/60"
                    aria-hidden
                  />
                ))}
            </div>
            <LoadMoreFooter
              autoLoad={false}
              className="mt-4 mb-2"
              batchSize={POS_PAGE_SIZE}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
              shown={products.length}
              total={total}
            />
          </>
        )}
      </div>
    </section>
  );
}
