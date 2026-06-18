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
    .reduce((sum, o) => sum + (o.amount || 0), 0);
  const assignedGoals = goals
    .reduce((sum, g) => sum + (g.assignedAmount || 0), 0);
  const assignedBuckets = buckets
    .reduce((sum, b) => sum + (b.currentAmount || 0), 0);
  const totalAssigned = assignedObligations + assignedGoals + assignedBuckets;
  const readyToAssign = balance - totalAssigned;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <SummaryBar
        balance={balance}
        totalAssigned={totalAssigned}
        readyToAssign={readyToAssign}
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
