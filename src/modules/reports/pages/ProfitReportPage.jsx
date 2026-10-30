import { ProfitAnalysisReport } from '@modules/reports/components/ProfitAnalysisReport';
import { ReportPageHeader } from '@modules/reports/components/ReportPageHeader';

export default function ProfitReportPage() {
  return (
    <div>
      <ReportPageHeader title="تحليل الأرباح" />
      <ProfitAnalysisReport />
    </div>
  );
}
