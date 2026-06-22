import { useState } from 'react';
import { useBudget } from '../hooks/useBudget';
import { useIncome } from '../hooks/useIncome';
import { useObligations } from '../hooks/useObligations';
import { useGoals } from '../hooks/useGoals';
import { useBuckets } from '../hooks/useBuckets';
import { useSubcategories } from '../hooks/useSubcategories';
import { useCategoryRules } from '../hooks/useCategoryRules';
import SummaryBar from './SummaryBar';
import AddIncomeModal from './AddIncomeModal';
import OverviewPage from '../pages/OverviewPage';
import PlannerPage from '../pages/PlannerPage';
import TransactionsPage from '../pages/TransactionsPage';
import { currentMonth } from '../utils/dateUtils';

export default function Dashboard({ user }) {
  const uid = user.uid;
  const cm = currentMonth();
  const [page, setPage] = useState('overview');
  const [showIncomeModal, setShowIncomeModal] = useState(false);

  const { balance, updateBalance } = useBudget(uid);
  const { income, addIncome, deleteIncome } = useIncome(uid);
  const {
    obligations,
    addObligation, updateObligation, deleteObligation, assignObligation, togglePaid,
  } = useObligations(uid);
  const {
    goals,
    addGoal, updateGoal, deleteGoal, assignGoal, addSpend,
  } = useGoals(uid);
  const {
    buckets,
    addBucket, updateBucket, deleteBucket, addFunds, withdraw,
  } = useBuckets(uid);
  const { subcategories, addSubcategory, updateSubcategory, deleteSubcategory } = useSubcategories(uid);
  const { rules: categoryRules } = useCategoryRules(uid);

  // Derived values — same formulas as before, never stored
  const assignedObligations = obligations
    .filter(o => o.assignedMonth === cm)
    .reduce((sum, o) => sum + (o.assignedAmount || 0), 0);
  const assignedGoals = goals.reduce((sum, g) => sum + (g.assignedAmount || 0), 0);
  const assignedBuckets = buckets.reduce((sum, b) => sum + (b.currentAmount || 0), 0);
  const totalAssigned = assignedObligations + assignedGoals + assignedBuckets;
  const readyToAssign = balance - totalAssigned;

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

  // Subcategories filtered by meta-category
  const obligationSubcats = subcategories.filter(s => s.metaCategory === 'obligations');
  const goalSubcats = subcategories.filter(s => s.metaCategory === 'goals');
  const bucketSubcats = subcategories.filter(s => s.metaCategory === 'buckets');

  const NAV = [
    { id: 'overview', label: 'Overview' },
    { id: 'planner', label: 'Planner' },
    { id: 'transactions', label: 'Transactions' },
  ];

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

      {/* Nav tabs */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: '#2a2d3e', backgroundColor: '#1a1d27' }}>
        {NAV.map(tab => (
          <button
            key={tab.id}
            onClick={() => setPage(tab.id)}
            className="px-5 py-3 text-sm font-medium transition-colors"
            style={{
              color: page === tab.id ? '#6366f1' : '#64748b',
              borderBottom: page === tab.id ? '2px solid #6366f1' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {page === 'overview' && (
        <OverviewPage
          obligations={obligations}
          goals={goals}
          buckets={buckets}
          cm={cm}
          income={income}
          onDeleteIncome={deleteIncome}
          onGoToPlanner={() => setPage('planner')}
        />
      )}
      {page === 'planner' && (
        <PlannerPage
          obligations={obligations}
          goals={goals}
          buckets={buckets}
          cm={cm}
          obligationSubcats={obligationSubcats}
          goalSubcats={goalSubcats}
          bucketSubcats={bucketSubcats}
          addObligation={addObligation}
          updateObligation={updateObligation}
          deleteObligation={deleteObligation}
          assignObligation={assignObligation}
          togglePaid={togglePaid}
          addGoal={addGoal}
          updateGoal={updateGoal}
          deleteGoal={deleteGoal}
          assignGoal={assignGoal}
          addSpend={addSpend}
          addBucket={addBucket}
          updateBucket={updateBucket}
          deleteBucket={deleteBucket}
          addFunds={addFunds}
          withdraw={withdraw}
          addSubcategory={addSubcategory}
          updateSubcategory={updateSubcategory}
          deleteSubcategory={deleteSubcategory}
          onGoToOverview={() => setPage('overview')}
        />
      )}
      {page === 'transactions' && (
        <TransactionsPage
          uid={uid}
          goals={goals}
          obligations={obligations}
          buckets={buckets}
          categoryRules={categoryRules}
        />
      )}

      {showIncomeModal && (
        <AddIncomeModal
          onClose={() => setShowIncomeModal(false)}
          onAdd={addIncome}
        />
      )}
    </div>
  );
}
