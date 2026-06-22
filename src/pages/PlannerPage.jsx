import ObligationsSection from '../components/planner/ObligationsSection';
import GoalsSection from '../components/planner/GoalsSection';
import BucketsSection from '../components/planner/BucketsSection';

export default function PlannerPage({
  uid, obligations, goals, buckets, cm,
  obligationSubcats, goalSubcats, bucketSubcats,
  addObligation, updateObligation, deleteObligation, assignObligation, togglePaid,
  addGoal, updateGoal, deleteGoal, assignGoal, addSpend,
  addBucket, updateBucket, deleteBucket, addFunds, unassignFunds, withdraw, fullyFundBucket, setMonthlyAssigned,
  addSubcategory, updateSubcategory, deleteSubcategory,
}) {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex flex-col gap-12">
          <ObligationsSection
            uid={uid}
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
            uid={uid}
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
            uid={uid}
            buckets={buckets}
            subcategories={bucketSubcats}
            addBucket={addBucket}
            updateBucket={updateBucket}
            deleteBucket={deleteBucket}
            addFunds={addFunds}
            unassignFunds={unassignFunds}
            withdraw={withdraw}
            fullyFundBucket={fullyFundBucket}
            setMonthlyAssigned={setMonthlyAssigned}
            addSubcategory={name => addSubcategory(name, 'buckets')}
            updateSubcategory={updateSubcategory}
            deleteSubcategory={deleteSubcategory}
          />
      </div>
    </div>
  );
}
