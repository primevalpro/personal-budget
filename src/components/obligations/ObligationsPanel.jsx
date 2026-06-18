import { useState } from 'react';
import { useObligations } from '../../hooks/useObligations';
import ObligationItem from './ObligationItem';
import { currentMonth, formatCurrency } from '../../utils/dateUtils';

export default function ObligationsPanel({ uid }) {
  const { obligations, loading, addObligation, updateObligation, deleteObligation, togglePaid } =
    useObligations(uid);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDay, setNewDueDay] = useState('');

  const month = currentMonth();
  const totalCommitted = obligations.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalRemaining = obligations
    .filter(o => o.paidMonth !== month)
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  async function handleAdd() {
    const name = newName.trim();
    const amount = Number(newAmount);
    const dueDay = Number(newDueDay);
    if (!name || isNaN(amount) || amount < 0 || isNaN(dueDay) || dueDay < 1 || dueDay > 31) return;
    await addObligation(name, amount, dueDay);
    setNewName('');
    setNewAmount('');
    setNewDueDay('');
    setShowAdd(false);
  }

  function handleAddKeyDown(e) {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') cancelAdd();
  }

  function cancelAdd() {
    setShowAdd(false);
    setNewName('');
    setNewAmount('');
    setNewDueDay('');
  }

  return (
    <div
      className="rounded-xl border flex flex-col md:min-h-0"
      style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
    >
      {/* Stats header */}
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
          <div className="text-right">
            <p
              className="text-lg font-semibold tabular-nums"
              style={{ color: totalRemaining > 0 ? '#f59e0b' : '#22c55e' }}
            >
              {formatCurrency(totalRemaining)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>remaining to pay</p>
          </div>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: '#2a2d3e' }} />

      {/* List */}
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
                onUpdate={updateObligation}
                onDelete={deleteObligation}
                onTogglePaid={togglePaid}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <>
          <div className="border-t" style={{ borderColor: '#2a2d3e' }} />
          <div className="px-3 py-3 flex flex-col gap-2">
            <input
              className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
              style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
              placeholder="Name  (e.g. Rent)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={handleAddKeyDown}
              autoFocus
            />
            <div className="flex gap-2">
              <input
                className="flex-1 bg-transparent border rounded-lg px-3 py-2 text-sm tabular-nums outline-none focus:border-indigo-500"
                style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                onKeyDown={handleAddKeyDown}
              />
              <input
                className="w-24 bg-transparent border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                style={{ borderColor: '#2a2d3e', color: '#f1f5f9' }}
                type="number"
                min="1"
                max="31"
                placeholder="Due day"
                value={newDueDay}
                onChange={e => setNewDueDay(e.target.value)}
                onKeyDown={handleAddKeyDown}
              />
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

      {/* Footer add button */}
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
