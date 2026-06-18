import { useState } from 'react';
import { useBudget } from '../hooks/useBudget';
import { useIncome } from '../hooks/useIncome';
import { useObligations } from '../hooks/useObligations';
import { useGoals } from '../hooks/useGoals';
import { useBuckets } from '../hooks/useBuckets';
import SummaryBar from './SummaryBar';
import AddIncomeModal from './AddIncomeModal';
import ObligationsPanel from './obligations/ObligationsPanel';
import GoalsPanel from './goals/GoalsPanel';
import BucketsPanel from './buckets/BucketsPanel';
import IncomeLog from './income/IncomeLog';
import { currentMonth } from '../utils/dateUtils';

export default function Dashboard({ user }) {
  const uid = user.uid;
  const cm = currentMonth();

  const { balance, updateBalance } = useBudget(uid);
  const { income, addIncome, deleteIncome } = useIncome(uid);
  const {
    obligations, loading: oblLoading,
    addObligation, updateObligation, deleteObligation, assignObligation, togglePaid,
  } = useObligations(uid);
  const {
    goals, loading: goalsLoading,
    addGoal, updateGoal, deleteGoal, assignGoal, addSpend,
  } = useGoals(uid);
  const {
    buckets, loading: bucketsLoading,
    addBucket, updateBucket, deleteBucket, addFunds, withdraw,
  } = useBuckets(uid);

  const [showIncomeModal, setShowIncomeModal] = useState(false);

  // Derive readyToAssign — never stored, always computed from live data
  const assignedObligations = obligations
    .filter(o => o.assignedMonth === cm)
    .reduce((sum, o) => sum + (o.assignedAmount || 0), 0);
  const assignedGoals = goals
    .reduce((sum, g) => sum + (g.assignedAmount || 0), 0);
  const assignedBuckets = buckets
    .reduce((sum, b) => sum + (b.currentAmount || 0), 0);
  const totalAssigned = assignedObligations + assignedGoals + assignedBuckets;
  const readyToAssign = balance - totalAssigned;

  // Monthly funding gap — how much still needs to be assigned to cover all targets this month
  const totalObCommitted = obligations.reduce((sum, o) => sum + (o.amount || 0), 0);
  const obGap = Math.max(0, totalObCommitted - assignedObligations);

  const totalGoalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
  const goalsGap = Math.max(0, totalGoalTarget - assignedGoals);

  const bucketsWithMonthly = buckets.filter(b => (b.monthlyTarget || 0) > 0);
  const totalBucketMonthlyTarget = bucketsWithMonthly.reduce((sum, b) => sum + b.monthlyTarget, 0);
  const totalBucketMonthlyAssigned = bucketsWithMonthly.reduce((sum, b) => sum + (b.monthlyAssigned || 0), 0);
  const bucketsGap = Math.max(0, totalBucketMonthlyTarget - totalBucketMonthlyAssigned);

  const monthlyFundingGap = obGap + goalsGap + bucketsGap;
  const gapBreakdown = { obligations: obGap, goals: goalsGap, buckets: bucketsGap };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <SummaryBar
        balance={balance}
        totalAssigned={totalAssigned}
        readyToAssign={readyToAssign}
        monthlyFundingGap={monthlyFundingGap}
        gapBreakdown={gapBreakdown}
        onEditBalance={updateBalance}
        onAddIncome={() => setShowIncomeModal(true)}
      />

      <main className="flex-1 min-h-0 p-4 md:p-6 flex flex-col md:overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-7xl w-full mx-auto md:flex-1 md:min-h-0">
          <ObligationsPanel
            obligations={obligations}
            loading={oblLoading}
            onAdd={addObligation}
            onUpdate={updateObligation}
            onDelete={deleteObligation}
            onAssign={assignObligation}
            onTogglePaid={togglePaid}
          />
          <GoalsPanel
            goals={goals}
            loading={goalsLoading}
            onAdd={addGoal}
            onUpdate={updateGoal}
            onDelete={deleteGoal}
            onAssign={assignGoal}
            onAddSpend={addSpend}
          />
          <BucketsPanel
            buckets={buckets}
            loading={bucketsLoading}
            onAdd={addBucket}
            onUpdate={updateBucket}
            onDelete={deleteBucket}
            onAddFunds={addFunds}
            onWithdraw={withdraw}
          />
        </div>
      </main>

      <IncomeLog income={income} onDelete={deleteIncome} />

      {showIncomeModal && (
        <AddIncomeModal
          onClose={() => setShowIncomeModal(false)}
          onAdd={addIncome}
        />
      )}
    </div>
  );
}
