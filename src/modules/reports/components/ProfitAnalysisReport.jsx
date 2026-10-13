import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { reportsApi } from '@modules/reports/api/reports.api';
import { brandsApi } from '@modules/brands/api/brands.api';
import { useListParams } from '@shared/hooks/useListParams';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';
import { TableScroll } from '@shared/components/TableScroll';
import { formatPrice } from '@core/constants';
import { notifyError, notifySuccess } from '@shared/services/toast.service';

function toLocalIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function currentMonthRange() {
  const now = new Date();
  return {
    from: toLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toLocalIsoDate(now),
  };
}

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

function formatCost(value) {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '—';
  return formatPrice(num);
}

function formatPeriodLabel(period, grain) {
  if (!period) return '—';
  if (grain === 'month' && /^\d{4}-\d{2}/.test(period)) {
    const [year, month] = period.slice(0, 7).split('-');
    return `${month}/${year}`;
  }
  return String(period).slice(0, 10);
}

export function ProfitAnalysisReport() {
  const { search, setSearch, page, setPage, withExtra } = useListParams();
  const defaults = useMemo(() => currentMonthRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [brandId, setBrandId] = useState('');
  const [period, setPeriod] = useState('month');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [from, to, brandId, period, setPage]);

  const listParams = withExtra({
    from: from || undefined,
    to: to || undefined,
    brand_id: brandId || undefined,
    period,
    limit: 20,
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands', 'admin'],
    queryFn: () => brandsApi.list(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['report-profit-analysis', listParams],
    queryFn: () => reportsApi.profitAnalysis(listParams),
  });

  const rows = data?.data || [];
  const brands = brandsData?.data || [];
  const summary = data?.summary || {};
  const byPeriod = data?.by_period || [];

  const exportReport = async () => {
    setExporting(true);
    try {
      const res = await reportsApi.profitAnalysis({
        search: listParams.search,
        from: listParams.from,
        to: listParams.to,
        brand_id: listParams.brand_id,
        period,
        export: 1,
      });
      const payload = res?.data;
      if (!payload?.csv) {
        notifyError({ message: 'تعذر تجهيز ملف التصدير' });
        return;
      }
      downloadCsv(payload.csv, payload.filename || 'profit-report.csv');
      notifySuccess({ message: `تم تصدير ${payload.count || 0} صنف` });
    } catch (error) {
      notifyError(error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="card overflow-hidden mb-8">
      <div className="p-4 sm:p-6 border-b dark:border-gray-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">تقرير المبيعات والتكلفة والأرباح</h2>
            <p className="text-sm text-gray-500 mt-1">
              الربح من سعر البيع بعد الخصم مقابل تكلفة الوحدة. إن لم تُثبَّت تكلفة وقت البيع تُستخدم تكلفة المنتج الحالية ثم تُثبَّت. الطلبات الملغاة والمرتجعة غير مشمولة.
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
            placeholder="بحث بالمنتج أو البراند أو المتغير أو SKU..."
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
          <input
            type="date"
            className="input w-full sm:w-auto"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            type="date"
            className="input w-full sm:w-auto"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <select
            className="input w-full sm:w-auto sm:min-w-[9rem]"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="month">تجميع شهري</option>
            <option value="day">تجميع يومي</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 p-4 sm:p-6">
        <div className="rounded-xl border dark:border-gray-700 p-4">
          <h3 className="text-gray-500 text-sm mb-1">إجمالي المبيعات</h3>
          <p className="text-xl font-bold text-primary-600">{formatPrice(summary.revenue)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {summary.sold_qty || 0} قطعة · {summary.orders_count || 0} طلب
          </p>
        </div>
        <div className="rounded-xl border dark:border-gray-700 p-4">
          <h3 className="text-gray-500 text-sm mb-1">إجمالي التكلفة</h3>
          <p className="text-xl font-bold">{formatCost(summary.cost)}</p>
          <p className="text-xs text-gray-500 mt-1">
            من الأصناف ذات التكلفة المثبتة فقط
          </p>
        </div>
        <div className="rounded-xl border dark:border-gray-700 p-4">
          <h3 className="text-gray-500 text-sm mb-1">صافي الربح</h3>
          <p className="text-xl font-bold text-green-600">{formatPrice(summary.profit)}</p>
          <p className="text-xs text-gray-500 mt-1">
            لا يشمل الأصناف بدون تكلفة
          </p>
        </div>
      </div>

      {summary.missing_cost_qty > 0 ? (
        <div className="mx-4 sm:mx-6 mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {summary.missing_cost_qty} قطعة بدون تكلفة مثبتة
          {' · '}
          مبيعاتها {formatPrice(summary.missing_cost_revenue)} غير داخلة في صافي الربح.
          أدخل تكلفة الشراء لهذه المنتجات من صفحة المنتج؛ بعد الحفظ تُحسب في هذا التقرير دون تغيير التكاليف المثبتة سابقاً.
        </div>
      ) : null}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="px-4 sm:px-6 pb-4">
            <h3 className="font-bold mb-3">
              {period === 'day' ? 'التجميع اليومي' : 'التجميع الشهري'}
            </h3>
            {!byPeriod.length ? (
              <EmptyState message="لا توجد مبيعات في الفترة المحددة" />
            ) : (
              <TableScroll>
                <table className="admin-table">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="text-right p-3">{period === 'day' ? 'اليوم' : 'الشهر'}</th>
                      <th className="text-right p-3">الكمية</th>
                      <th className="text-right p-3">المبيعات</th>
                      <th className="text-right p-3">التكلفة</th>
                      <th className="text-right p-3">الربح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPeriod.map((row) => (
                      <tr key={row.period} className="border-t dark:border-gray-700">
                        <td className="p-3">{formatPeriodLabel(row.period, period)}</td>
                        <td className="p-3">{row.qty_sold}</td>
                        <td className="p-3">{formatPrice(row.revenue)}</td>
                        <td className="p-3">{formatCost(row.cost)}</td>
                        <td className="p-3 font-medium">{formatPrice(row.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </div>

          <div className="px-4 sm:px-6 pb-6">
            <h3 className="font-bold mb-3">تفصيل المنتجات والمتغيرات</h3>
            {!rows.length ? (
              <EmptyState message="لا توجد أصناف مطابقة للبحث أو التصفية" />
            ) : (
              <>
                <TableScroll>
                  <table className="admin-table">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="text-right p-3">المنتج</th>
                        <th className="text-right p-3">البراند</th>
                        <th className="text-right p-3">المتغير</th>
                        <th className="text-right p-3">الكمية</th>
                        <th className="text-right p-3">سعر البيع</th>
                        <th className="text-right p-3">تكلفة الوحدة</th>
                        <th className="text-right p-3">إجمالي المبيعات</th>
                        <th className="text-right p-3">إجمالي التكلفة</th>
                        <th className="text-right p-3">صافي الربح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={`${row.product_id}-${row.variant_id || 'p'}`}
                          className="border-t dark:border-gray-700"
                        >
                          <td className="p-3">
                            <div className="font-medium">{row.product_name}</div>
                            {row.sku ? (
                              <div className="text-xs text-gray-400">{row.sku}</div>
                            ) : null}
                          </td>
                          <td className="p-3">{row.brand_name || '—'}</td>
                          <td className="p-3">{row.variant_info || '—'}</td>
                          <td className="p-3">{row.qty_sold}</td>
                          <td className="p-3">{formatPrice(row.avg_sale_price)}</td>
                          <td className="p-3">
                            {formatCost(row.avg_unit_cost)}
                            {row.missing_cost_qty > 0 ? (
                              <div className="text-xs text-amber-600">
                                {row.missing_cost_qty} بدون تكلفة
                              </div>
                            ) : null}
                          </td>
                          <td className="p-3">{formatPrice(row.total_sales)}</td>
                          <td className="p-3">{formatCost(row.total_cost)}</td>
                          <td className="p-3 font-medium">{formatPrice(row.net_profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
                <Pagination pagination={data?.pagination} page={page} onPageChange={setPage} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
