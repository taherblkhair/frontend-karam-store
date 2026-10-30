import { StockAvailabilityReport } from '@modules/reports/components/StockAvailabilityReport';
import { ReportPageHeader } from '@modules/reports/components/ReportPageHeader';

export default function StockAvailabilityReportPage() {
  return (
    <div>
      <ReportPageHeader title="الأكثر توفرًا في المخزون" />
      <StockAvailabilityReport />
    </div>
  );
}
