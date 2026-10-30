import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@modules/reports/api/reports.api';
import { ReportPageHeader } from '@modules/reports/components/ReportPageHeader';
import { formatPrice } from '@core/constants';

export default function SalesReportPage() {
  const { data: sales } = useQuery({
    queryKey: ['report-sales'],
    queryFn: () => reportsApi.sales(),
  });

  const { data: products } = useQuery({
    queryKey: ['report-products'],
    queryFn: () => reportsApi.products(),
  });

  return (
    <div>
      <ReportPageHeader title="المبيعات" />

      <div className="card p-6 mb-6">
        <h3 className="text-gray-500 mb-2">إجمالي المبيعات (كل الطلبات)</h3>
        <p className="text-2xl font-bold text-primary-600">{formatPrice(sales?.data?.summary?.revenue)}</p>
        <p className="text-sm text-gray-500">{sales?.data?.summary?.total_orders} طلب</p>
      </div>

      <div className="card p-6">
        <h2 className="font-bold mb-4">تقرير المنتجات</h2>
        <div className="overflow-x-auto max-h-96">
          <table className="admin-table">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-right py-2">المنتج</th>
                <th className="text-right py-2">المباع</th>
                <th className="text-right py-2">الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              {products?.data?.slice(0, 20).map((p) => (
                <tr key={p.id} className="border-b dark:border-gray-700">
                  <td className="py-2">{p.name_ar}</td>
                  <td className="py-2">{p.total_sold}</td>
                  <td className="py-2">{formatPrice(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
