import ObligationsPanel from './obligations/ObligationsPanel';
import GoalsPanel from './goals/GoalsPanel';
import BucketsPanel from './buckets/BucketsPanel';

export default function Dashboard({ user }) {
  return (
    <main className="flex-1 min-h-0 p-4 md:p-6 flex flex-col md:overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-7xl w-full mx-auto md:flex-1 md:min-h-0">
        <ObligationsPanel uid={user.uid} />
        <GoalsPanel uid={user.uid} />
        <BucketsPanel uid={user.uid} />
      </div>
    </main>
  );
}
