import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@modules/reports/api/reports.api';
import { ReportPageHeader } from '@modules/reports/components/ReportPageHeader';
import { formatPrice } from '@core/constants';

export default function InventoryReportPage() {
  const { data: inventory } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => reportsApi.inventory(),
  });

  return (
    <div>
      <ReportPageHeader title="المخزون" />

      <div className="card p-6 mb-6">
        <h3 className="text-gray-500 mb-2">قيمة المخزون</h3>
        <p className="text-2xl font-bold">
          {formatPrice(inventory?.data?.reduce((s, i) => s + parseFloat(i.stock_value || 0), 0))}
        </p>
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
  );
}
