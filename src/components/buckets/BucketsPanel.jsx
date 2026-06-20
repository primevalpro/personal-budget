import { useState } from 'react';
import BucketItem from './BucketItem';
import { formatCurrency } from '../../utils/dateUtils';

export default function BucketsPanel({ buckets, loading, onAdd, onUpdate, onDelete, onAddFunds, onWithdraw, onFullyFund, onSetMonthlyAssigned }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newMonthlyTarget, setNewMonthlyTarget] = useState('');

  const completed = buckets.filter(b => (b.currentAmount || 0) >= b.targetAmount).length;
  const totalSaved = buckets.reduce((sum, b) => sum + (b.currentAmount || 0), 0);

  // Monthly targets summary — only shown when at least one bucket has a monthlyTarget
  const bucketsWithMonthly = buckets.filter(b => (b.monthlyTarget || 0) > 0);
  const totalMonthlyTarget = bucketsWithMonthly.reduce((sum, b) => sum + b.monthlyTarget, 0);
  const totalMonthlyAssigned = bucketsWithMonthly.reduce((sum, b) => sum + (b.monthlyAssigned || 0), 0);
  const monthlyMet = totalMonthlyAssigned >= totalMonthlyTarget;

  async function handleAdd() {
    const name = newName.trim();
    const targetAmount = Number(newTarget);
    if (!name || isNaN(targetAmount) || targetAmount < 0) return;
    await onAdd(name, targetAmount, Number(newMonthlyTarget) || 0);
    setNewName('');
    setNewTarget('');
    setNewMonthlyTarget('');
    setShowAdd(false);
  }

  function addKeyDown(e) {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') cancelAdd();
  }

  function cancelAdd() {
    setShowAdd(false);
    setNewName('');
    setNewTarget('');
    setNewMonthlyTarget('');
  }

  return (
    <div
      className="rounded-xl border flex flex-col md:min-h-0"
      style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
    >
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#64748b' }}>Buckets</p>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: '#f1f5f9' }}>{formatCurrency(totalSaved)}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>total saved</p>
          </div>
          {buckets.length > 0 && (
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums" style={{ color: completed === buckets.length ? '#22c55e' : '#64748b' }}>
                {completed} / {buckets.length}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>completed</p>
            </div>
          )}
        </div>

        {/* Monthly targets progress — only when at least one bucket has a monthlyTarget */}
        {bucketsWithMonthly.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: '#2a2d3e' }}>
            <div className="flex items-center justify-between text-xs tabular-nums">
              <span style={{ color: '#64748b' }}>Monthly targets:</span>
              <span style={{ color: monthlyMet ? '#22c55e' : '#f59e0b' }}>
                {monthlyMet ? '✓ ' : ''}{formatCurrency(totalMonthlyAssigned)} / {formatCurrency(totalMonthlyTarget)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t" style={{ borderColor: '#2a2d3e' }} />

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <p className="text-sm py-6 text-center" style={{ color: '#64748b' }}>Loading…</p>
        ) : buckets.length === 0 ? (
          <p className="text-sm py-6 text-center px-4" style={{ color: '#64748b' }}>
            No buckets yet — add a savings goal below.
          </p>
        ) : (
          <div className="px-3 flex flex-col">
            {buckets.map((b, i) => (
              <div key={b.id}>
                <BucketItem
                  bucket={b}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onAddFunds={onAddFunds}
                  onFullyFund={onFullyFund}
                  onSetMonthlyAssigned={onSetMonthlyAssigned}
                />
                {i < buckets.length - 1 && <div className="border-t" style={{ borderColor: '#2a2d3e' }} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <>
          <div className="border-t" style={{ borderColor: '#2a2d3e' }} />
          <div className="px-3 py-3 flex flex-col gap-2">
            <input
              className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm outline-none"
              style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
              placeholder="Name  (e.g. Emergency Fund)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={addKeyDown}
              autoFocus
            />
            <input
              className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm tabular-nums outline-none"
              style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
              type="number" min="0" step="0.01"
              placeholder="Savings goal (total target)"
              value={newTarget}
              onChange={e => setNewTarget(e.target.value)}
              onKeyDown={addKeyDown}
            />
            <input
              className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm tabular-nums outline-none"
              style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
              type="number" min="0" step="0.01"
              placeholder="Monthly target (optional)"
              value={newMonthlyTarget}
              onChange={e => setNewMonthlyTarget(e.target.value)}
              onKeyDown={addKeyDown}
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="flex-1 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}>Add</button>
              <button onClick={cancelAdd} className="px-4 py-2 rounded-lg text-sm border transition-opacity hover:opacity-80" style={{ borderColor: '#2a2d3e', color: '#64748b' }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {!showAdd && (
        <>
          <div className="border-t" style={{ borderColor: '#2a2d3e' }} />
          <div className="p-3">
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-2 rounded-lg text-sm border transition-opacity hover:opacity-80"
              style={{ borderColor: '#2a2d3e', color: '#64748b' }}
            >
              + Add Bucket
            </button>
          </div>
        </>
      )}
    </div>
  );
}
