import ObligationsSection from '../components/planner/ObligationsSection';
import GoalsSection from '../components/planner/GoalsSection';
import BucketsSection from '../components/planner/BucketsSection';

export default function PlannerPage({
  obligations, goals, buckets, cm,
  obligationSubcats, goalSubcats, bucketSubcats,
  addObligation, updateObligation, deleteObligation, assignObligation, togglePaid,
  addGoal, updateGoal, deleteGoal, assignGoal, addSpend,
  addBucket, updateBucket, deleteBucket, addFunds, withdraw,
  addSubcategory, updateSubcategory, deleteSubcategory,
  onGoToOverview,
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={onGoToOverview}
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: '#6366f1' }}
          >
            ← Overview
          </button>
        </div>

        <div className="flex flex-col gap-12">
          <ObligationsSection
            obligations={obligations}
            subcategories={obligationSubcats}
            cm={cm}
            addObligation={addObligation}
            updateObligation={updateObligation}
            deleteObligation={deleteObligation}
            assignObligation={assignObligation}
            togglePaid={togglePaid}
            addSubcategory={name => addSubcategory(name, 'obligations')}
            updateSubcategory={updateSubcategory}
            deleteSubcategory={deleteSubcategory}
          />
          <GoalsSection
            goals={goals}
            subcategories={goalSubcats}
            addGoal={addGoal}
            updateGoal={updateGoal}
            deleteGoal={deleteGoal}
            assignGoal={assignGoal}
            addSpend={addSpend}
            addSubcategory={name => addSubcategory(name, 'goals')}
            updateSubcategory={updateSubcategory}
            deleteSubcategory={deleteSubcategory}
          />
          <BucketsSection
            buckets={buckets}
            subcategories={bucketSubcats}
            addBucket={addBucket}
            updateBucket={updateBucket}
            deleteBucket={deleteBucket}
            addFunds={addFunds}
            withdraw={withdraw}
            addSubcategory={name => addSubcategory(name, 'buckets')}
            updateSubcategory={updateSubcategory}
            deleteSubcategory={deleteSubcategory}
          />
        </div>
      </div>
    </div>
  );
}
