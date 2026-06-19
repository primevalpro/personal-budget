import OverviewCard from '../components/overview/OverviewCard';
import IncomeLog from '../components/income/IncomeLog';
import { monthLabel } from '../utils/dateUtils';

export default function OverviewPage({ obligations, goals, buckets, cm, income, onDeleteIncome, onGoToPlanner }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold" style={{ color: '#f1f5f9' }}>
            {monthLabel(cm)}
          </h2>
          <button
            onClick={onGoToPlanner}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
          >
            Open Planner →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <OverviewCard type="obligations" obligations={obligations} cm={cm} />
          <OverviewCard type="goals" goals={goals} />
          <OverviewCard type="buckets" buckets={buckets} />
        </div>

        <IncomeLog income={income} onDelete={onDeleteIncome} />
      </div>
    </div>
  );
}
