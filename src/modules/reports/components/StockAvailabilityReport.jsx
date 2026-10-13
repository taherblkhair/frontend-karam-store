import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Package } from 'lucide-react';
import { reportsApi } from '@modules/reports/api/reports.api';
import { brandsApi } from '@modules/brands/api/brands.api';
import { useListParams } from '@shared/hooks/useListParams';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';
import { TableScroll } from '@shared/components/TableScroll';
import { resolveMediaUrl } from '@core/api/config.js';
import { notifyError, notifySuccess } from '@shared/services/toast.service';

function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function quantityClass(qty) {
  if (qty <= 0) return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  if (qty < 5) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
}

export function StockAvailabilityReport() {
  const { search, setSearch, page, setPage, withExtra } = useListParams();
  const [brandId, setBrandId] = useState('');
  const [kind, setKind] = useState('');
  const [stock, setStock] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [brandId, kind, stock, setPage]);

  const listParams = withExtra({
    brand_id: brandId || undefined,
    kind: kind || undefined,
    stock: stock || undefined,
    limit: 20,
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands', 'admin'],
    queryFn: () => brandsApi.list(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['report-stock-availability', listParams],
    queryFn: () => reportsApi.stockAvailability(listParams),
  });

  const rows = data?.data || [];
  const brands = brandsData?.data || [];
  const totalUnits = Number(data?.total_units) || 0;

  const exportReport = async () => {
    setExporting(true);
    try {
      const res = await reportsApi.stockAvailability({
        search: listParams.search,
        brand_id: listParams.brand_id,
        kind: listParams.kind,
        stock: listParams.stock,
        export: 1,
      });
      const payload = res?.data;
      if (!payload?.csv) {
        notifyError({ message: 'تعذر تجهيز ملف التصدير' });
        return;
      }
      downloadCsv(payload.csv, payload.filename || 'stock-availability.csv');
      notifySuccess({ message: `تم تصدير ${payload.count || 0} صنف` });
    } catch (error) {
      notifyError(error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="p-4 sm:p-6 border-b dark:border-gray-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">تقرير الأكثر توفرًا في المخزون</h2>
            <p className="text-sm text-gray-500 mt-1">
              كل منتج ومتغير على حدة، مرتّب من الأعلى كمية إلى الأقل
            </p>
          </div>
          <button
            type="button"
            className="btn-primary text-sm whitespace-nowrap"
            disabled={exporting || isLoading}
            onClick={exportReport}
          >
            <Download size={16} />
            {exporting ? 'جاري التصدير...' : 'تصدير CSV'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="بحث بالمنتج أو البراند أو اللون أو المقاس أو SKU..."
          />
          <select
            className="input w-full sm:w-auto sm:min-w-[10rem]"
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
          >
            <option value="">كل البراندات</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name_ar}
              </option>
            ))}
          </select>
          <select
            className="input w-full sm:w-auto sm:min-w-[9rem]"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="">كل الأنواع</option>
            <option value="variant">متغيرات فقط</option>
            <option value="simple">منتجات بدون متغيرات</option>
          </select>
          <select
            className="input w-full sm:w-auto sm:min-w-[9rem]"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          >
            <option value="">كل الكميات</option>
            <option value="in">متوفر</option>
            <option value="out">غير متوفر</option>
          </select>
        </div>

        <p className="text-xs text-gray-500">
          إجمالي الأصناف: {data?.pagination?.total ?? 0}
          {' · '}
          مجموع الكميات: {totalUnits}
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !rows.length ? (
        <EmptyState message="لا توجد أصناف مطابقة للبحث أو التصفية" />
      ) : (
        <TableScroll>
          <table className="admin-table">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-right p-4">المنتج</th>
                <th className="text-right p-4">البراند</th>
                <th className="text-right p-4">المتغير</th>
                <th className="text-right p-4">SKU</th>
                <th className="text-right p-4">الكمية المتاحة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const image = resolveMediaUrl(row.image_url);
                const key = `${row.product_id}-${row.variant_id || 'p'}`;
                return (
                  <tr key={key} className="border-t dark:border-gray-700">
                    <td className="p-4">
                      <div className="flex items-center gap-3 min-w-[14rem]">
                        {image ? (
                          <img
                            src={image}
                            alt={row.product_name}
                            className="h-12 w-12 rounded-lg object-cover bg-gray-100 shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-gray-400">
                            <Package size={18} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{row.product_name}</div>
                          <div className="text-xs text-gray-400">
                            {row.kind_label || (row.kind === 'variant' ? 'متغير' : 'منتج بسيط')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      {row.brand_name || '—'}
                    </td>
                    <td className="p-4">
                      {row.variant_info ? (
                        <div>
                          <div className="font-medium">{row.variant_info}</div>
                          <div className="text-xs text-gray-400">
                            {[row.color_name && `اللون: ${row.color_name}`, row.size_name && `المقاس: ${row.size_name}`]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-gray-400 font-mono">
                      {row.variant_sku || row.product_sku || '—'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex min-w-[2.75rem] justify-center px-2.5 py-1 rounded-lg font-bold ${quantityClass(
                          Number(row.quantity)
                        )}`}
                      >
                        {row.quantity}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
      )}

      <div className="p-4">
        <Pagination pagination={data?.pagination} page={page} onPageChange={setPage} />
      </div>
    </div>
  );
}
