import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function ReportPageHeader({ title }) {
  return (
    <div className="mb-6">
      <Link
        to="/admin/reports"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-2"
      >
        <ChevronRight size={16} />
        التقارير
      </Link>
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  );
}
