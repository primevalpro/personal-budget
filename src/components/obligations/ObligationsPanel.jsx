import { useState } from 'react';
import ObligationItem from './ObligationItem';
import { currentMonth, formatCurrency } from '../../utils/dateUtils';

export default function ObligationsPanel({ obligations, loading, onAdd, onUpdate, onDelete, onAssign, onTogglePaid }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDay, setNewDueDay] = useState('');
  const [newRecurring, setNewRecurring] = useState(true);

  const month = currentMonth();
  const totalCommitted = obligations.reduce((sum, o) => sum + (o.amount || 0), 0);
  const fullCount = obligations.filter(o => o.assignedMonth === month && (o.assignedAmount || 0) >= o.amount && o.amount > 0).length;
  const partialCount = obligations.filter(o => o.assignedMonth === month && (o.assignedAmount || 0) > 0 && (o.assignedAmount || 0) < o.amount).length;
  const unassignedCount = obligations.length - fullCount - partialCount;

  async function handleAdd() {
    const name = newName.trim();
    const amount = Number(newAmount);
    const dueDay = Number(newDueDay);
    if (!name || isNaN(amount) || amount < 0 || isNaN(dueDay) || dueDay < 1 || dueDay > 31) return;
    await onAdd(name, amount, dueDay, newRecurring);
    setNewName('');
    setNewAmount('');
    setNewDueDay('');
    setNewRecurring(true);
    setShowAdd(false);
  }

  function addKeyDown(e) {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') cancelAdd();
  }

  function cancelAdd() {
    setShowAdd(false);
    setNewName('');
    setNewAmount('');
    setNewDueDay('');
    setNewRecurring(true);
  }

  return (
    <div
      className="rounded-xl border flex flex-col md:min-h-0"
      style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
    >
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#64748b' }}>
          Obligations
        </p>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: '#f1f5f9' }}>
              {formatCurrency(totalCommitted)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>committed this month</p>
          </div>
          {obligations.length > 0 && (
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums" style={{ color: fullCount === obligations.length ? '#22c55e' : '#64748b' }}>
                {fullCount} full
              </p>
              {partialCount > 0 && (
                <p className="text-xs tabular-nums" style={{ color: '#f59e0b' }}>{partialCount} partial</p>
              )}
              {unassignedCount > 0 && (
                <p className="text-xs tabular-nums" style={{ color: '#64748b' }}>{unassignedCount} unassigned</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t" style={{ borderColor: '#2a2d3e' }} />

      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        {loading ? (
          <p className="text-sm py-6 text-center" style={{ color: '#64748b' }}>Loading…</p>
        ) : obligations.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: '#64748b' }}>
            No obligations yet — add your first one below.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {obligations.map(o => (
              <ObligationItem
                key={o.id}
                obligation={o}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAssign={onAssign}
                onTogglePaid={onTogglePaid}
              />
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
              placeholder="Name  (e.g. Rent)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={addKeyDown}
              autoFocus
            />
            <div className="flex gap-2">
              <input
                className="flex-1 bg-transparent border rounded-lg px-3 py-2 text-sm tabular-nums outline-none"
                style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                onKeyDown={addKeyDown}
              />
              <input
                className="w-24 bg-transparent border rounded-lg px-3 py-2 text-sm outline-none"
                style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
                type="number"
                min="1"
                max="31"
                placeholder="Due day"
                value={newDueDay}
                onChange={e => setNewDueDay(e.target.value)}
                onKeyDown={addKeyDown}
              />
            </div>

            {/* Recurring / One-time toggle */}
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#2a2d3e' }}>
              <button
                type="button"
                onClick={() => setNewRecurring(true)}
                className="flex-1 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: newRecurring ? '#6366f1' : 'transparent',
                  color: newRecurring ? '#f1f5f9' : '#64748b',
                }}
              >
                Recurring
              </button>
              <button
                type="button"
                onClick={() => setNewRecurring(false)}
                className="flex-1 py-1.5 text-xs font-semibold transition-colors border-l"
                style={{
                  borderColor: '#2a2d3e',
                  backgroundColor: !newRecurring ? '#6366f1' : 'transparent',
                  color: !newRecurring ? '#f1f5f9' : '#64748b',
                }}
              >
                One-time
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
              >
                Add
              </button>
              <button
                onClick={cancelAdd}
                className="px-4 py-2 rounded-lg text-sm border transition-opacity hover:opacity-80"
                style={{ borderColor: '#2a2d3e', color: '#64748b' }}
              >
                Cancel
              </button>
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
              + Add Obligation
            </button>
          </div>
        </>
      )}
    </div>
  );
}
