import { useQuery } from '@tanstack/react-query';
import { DollarSign, ShoppingBag, Package, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import api from '../../api/axios';
import { StatCard, LoadingSpinner, OrderStatusBadge } from '../../components/ui';
import { formatPrice } from '../../utils/constants';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard'),
  });

  if (isLoading) return <LoadingSpinner />;

  const stats = data?.data;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">لوحة التحكم</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="مبيعات اليوم" value={formatPrice(stats?.salesToday?.total)} icon={DollarSign} color="green" />
        <StatCard title="طلبات اليوم" value={stats?.salesToday?.count || 0} icon={ShoppingBag} color="blue" />
        <StatCard title="مبيعات الشهر" value={formatPrice(stats?.salesMonth?.total)} icon={TrendingUp} color="primary" />
        <StatCard title="المنتجات" value={stats?.productCount || 0} icon={Package} color="orange" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-bold mb-4">الطلبات حسب الحالة</h2>
          <div className="space-y-3">
            {stats?.orderStats?.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <OrderStatusBadge status={s.status} />
                <span className="font-bold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-500" />
            تنبيهات
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <span>منتجات منخفضة المخزون</span>
              <span className="font-bold text-orange-600">{stats?.lowStockCount || 0}</span>
            </div>
            <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span>إجمالي العملاء</span>
              <span className="font-bold">{stats?.customerCount || 0}</span>
            </div>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="font-bold mb-4">الأكثر مبيعاً</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-right py-3">المنتج</th>
                  <th className="text-right py-3">الكمية</th>
                  <th className="text-right py-3">الإيرادات</th>
                </tr>
              </thead>
              <tbody>
                {stats?.topProducts?.map((p) => (
                  <tr key={p.product_id} className="border-b dark:border-gray-700">
                    <td className="py-3">{p.product_name}</td>
                    <td className="py-3">{p.total_sold}</td>
                    <td className="py-3">{formatPrice(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="font-bold mb-4">آخر الطلبات</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-right py-3">رقم الطلب</th>
                  <th className="text-right py-3">العميل</th>
                  <th className="text-right py-3">المبلغ</th>
                  <th className="text-right py-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentOrders?.map((o) => (
                  <tr key={o.id} className="border-b dark:border-gray-700">
                    <td className="py-3">{o.order_number}</td>
                    <td className="py-3">{o.customer_name}</td>
                    <td className="py-3">{formatPrice(o.total)}</td>
                    <td className="py-3"><OrderStatusBadge status={o.status} /></td>
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
