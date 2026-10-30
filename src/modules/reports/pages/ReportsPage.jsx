import { Link } from 'react-router-dom';
import { ChevronLeft, PackageCheck, Receipt, TrendingUp, Warehouse } from 'lucide-react';

const reports = [
  {
    to: '/admin/reports/profit',
    icon: TrendingUp,
    title: 'تحليل الأرباح',
    description: 'المبيعات والتكلفة والأرباح لكل صنف مع التصفية بالفترة والبراند والتصدير.',
  },
  {
    to: '/admin/reports/sales',
    icon: Receipt,
    title: 'المبيعات',
    description: 'إجمالي المبيعات وعدد الطلبات، والكميات المباعة وإيرادات كل منتج.',
  },
  {
    to: '/admin/reports/inventory',
    icon: Warehouse,
    title: 'المخزون',
    description: 'قيمة المخزون الحالية والكميات المتوفرة لكل منتج.',
  },
  {
    to: '/admin/reports/stock-availability',
    icon: PackageCheck,
    title: 'الأكثر توفرًا في المخزون',
    description: 'ترتيب الأصناف حسب الكمية المتوفرة مع إمكانية التصدير.',
  },
];

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">التقارير</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        {reports.map(({ to, icon: Icon, title, description }) => (
          <Link
            key={to}
            to={to}
            className="card p-5 sm:p-6 flex items-start gap-4 transition hover:border-primary-600/40 hover:shadow-md"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30">
              <Icon size={22} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-lg">{title}</span>
              <span className="block text-sm text-gray-500 mt-1 leading-relaxed">{description}</span>
            </span>
            <ChevronLeft size={20} className="shrink-0 self-center text-gray-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
