import OverviewCard from '../components/overview/OverviewCard';
import IncomeLog from '../components/income/IncomeLog';
import { monthLabel } from '../utils/dateUtils';

export default function OverviewPage({ obligations, goals, buckets, cm, income, onDeleteIncome }) {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <IncomeLog income={income} onDelete={onDeleteIncome} />

      <div className="mt-6 mb-6">
        <h2 className="text-lg font-semibold" style={{ color: '#f1f5f9' }}>
          {monthLabel(cm)}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <OverviewCard type="obligations" obligations={obligations} cm={cm} />
        <OverviewCard type="goals" goals={goals} />
        <OverviewCard type="buckets" buckets={buckets} />
      </div>
    </div>
  );
}
