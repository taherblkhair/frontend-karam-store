import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@modules/reports/api/reports.api';
import { LoadingSpinner } from '@shared/ui';
import { formatPrice } from '@core/constants';
import { TableScroll } from '@shared/components/TableScroll';

export default function ReportsPage() {
  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ['report-sales'],
    queryFn: () => reportsApi.sales(),
  });

  const { data: profit } = useQuery({
    queryKey: ['report-profit'],
    queryFn: () => reportsApi.profit(),
  });

  const { data: inventory } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => reportsApi.inventory(),
  });

  const { data: products } = useQuery({
    queryKey: ['report-products'],
    queryFn: () => reportsApi.products(),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">التقارير</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <h3 className="text-gray-500 mb-2">إجمالي المبيعات</h3>
          <p className="text-2xl font-bold text-primary-600">{formatPrice(sales?.data?.summary?.revenue)}</p>
          <p className="text-sm text-gray-500">{sales?.data?.summary?.total_orders} طلب</p>
        </div>
        <div className="card p-6">
          <h3 className="text-gray-500 mb-2">الأرباح</h3>
          <p className="text-2xl font-bold text-green-600">{formatPrice(profit?.data?.profit)}</p>
          <p className="text-sm text-gray-500">التكلفة: {formatPrice(profit?.data?.cost)}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-gray-500 mb-2">قيمة المخزون</h3>
          <p className="text-2xl font-bold">{formatPrice(inventory?.data?.reduce((s, i) => s + parseFloat(i.stock_value || 0), 0))}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
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

        <div className="card p-6">
          <h2 className="font-bold mb-4">تقرير المخزون</h2>
          <div className="overflow-x-auto max-h-96">
            <table className="admin-table">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-right py-2">المنتج</th>
                  <th className="text-right py-2">الكمية</th>
                  <th className="text-right py-2">القيمة</th>
                </tr>
              </thead>
              <tbody>
                {inventory?.data?.slice(0, 20).map((i) => (
                  <tr key={i.id} className="border-b dark:border-gray-700">
                    <td className="py-2">{i.name_ar}</td>
                    <td className="py-2">{i.total_quantity}</td>
                    <td className="py-2">{formatPrice(i.stock_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
