import { useState } from 'react';
import GoalItem from './GoalItem';
import { currentMonth, monthLabel, formatCurrency } from '../../utils/dateUtils';

export default function GoalsPanel({ goals, loading, onAdd, onUpdate, onDelete, onAssign, onAddSpend }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newTarget, setNewTarget] = useState('');

  const totalAssigned = goals.reduce((sum, g) => sum + (g.assignedAmount || 0), 0);
  const totalSpent = goals.reduce((sum, g) => sum + (g.spentAmount || 0), 0);

  async function handleAdd() {
    const category = newCategory.trim();
    const targetAmount = Number(newTarget);
    if (!category || isNaN(targetAmount) || targetAmount < 0) return;
    await onAdd(category, targetAmount);
    setNewCategory('');
    setNewTarget('');
    setShowAdd(false);
  }

  function addKeyDown(e) {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') cancelAdd();
  }

  function cancelAdd() {
    setShowAdd(false);
    setNewCategory('');
    setNewTarget('');
  }

  return (
    <div
      className="rounded-xl border flex flex-col md:min-h-0"
      style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
    >
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>Goals</p>
          <p className="text-xs" style={{ color: '#64748b' }}>{monthLabel(currentMonth())}</p>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: '#f1f5f9' }}>
              {formatCurrency(totalAssigned)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>assigned</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums" style={{ color: '#64748b' }}>
              {formatCurrency(totalSpent)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>spent</p>
          </div>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: '#2a2d3e' }} />

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <p className="text-sm py-6 text-center" style={{ color: '#64748b' }}>Loading…</p>
        ) : goals.length === 0 ? (
          <p className="text-sm py-6 text-center px-4" style={{ color: '#64748b' }}>
            No goals for this month — add one below.
          </p>
        ) : (
          <div className="px-3 flex flex-col">
            {goals.map((g, i) => (
              <div key={g.id}>
                <GoalItem
                  goal={g}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onAssign={onAssign}
                  onAddSpend={onAddSpend}
                />
                {i < goals.length - 1 && <div className="border-t" style={{ borderColor: '#2a2d3e' }} />}
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
              placeholder="Category  (e.g. Groceries)"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              onKeyDown={addKeyDown}
              autoFocus
            />
            <input
              className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm tabular-nums outline-none"
              style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
              type="number"
              min="0"
              step="0.01"
              placeholder="Monthly budget"
              value={newTarget}
              onChange={e => setNewTarget(e.target.value)}
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
              + Add Goal
            </button>
          </div>
        </>
      )}
    </div>
  );
}
