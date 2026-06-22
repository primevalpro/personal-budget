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
  const [activePage, setActivePage] = useState('budget');
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
    buckets, loading: bucketsLoading,
    addBucket, updateBucket, deleteBucket, addFunds, unassignFunds, withdraw, fullyFundBucket, setMonthlyAssigned,
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

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Top-level tab strip */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: '#2a2d3e', backgroundColor: '#1a1d27' }}>
        {['budget', 'transactions'].map(t => (
          <button
            key={t}
            onClick={() => setActivePage(t)}
            className="px-5 py-3 text-sm font-medium capitalize transition-colors"
            style={{
              color: activePage === t ? '#6366f1' : '#64748b',
              borderBottom: activePage === t ? '2px solid #6366f1' : '2px solid transparent',
            }}
          >
            {t === 'budget' ? 'Budget' : 'Transactions'}
          </button>
        ))}
      </div>

      {activePage === 'transactions' ? (
        <TransactionsPage
          uid={uid}
          goals={goals}
          obligations={obligations}
          buckets={buckets}
          categoryRules={categoryRules}
        />
      ) : (
        <>
          <SummaryBar
            balance={balance}
            totalAssigned={totalAssigned}
            readyToAssign={readyToAssign}
            monthlyFundingGap={monthlyFundingGap}
            gapBreakdown={gapBreakdown}
            onEditBalance={updateBalance}
            onAddIncome={() => setShowIncomeModal(true)}
          />

          <div className="flex-1 min-h-0 overflow-y-auto">
            <OverviewPage
              obligations={obligations}
              goals={goals}
              buckets={buckets}
              cm={cm}
              income={income}
              onDeleteIncome={deleteIncome}
            />
            <PlannerPage
              uid={uid}
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
              unassignFunds={unassignFunds}
              withdraw={withdraw}
              fullyFundBucket={fullyFundBucket}
              setMonthlyAssigned={setMonthlyAssigned}
              addSubcategory={addSubcategory}
              updateSubcategory={updateSubcategory}
              deleteSubcategory={deleteSubcategory}
            />
          </div>

          {showIncomeModal && (
            <AddIncomeModal
              onClose={() => setShowIncomeModal(false)}
              onAdd={addIncome}
            />
          )}
        </>
      )}
    </div>
  );
}
